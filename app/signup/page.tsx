// PATH: app/signup/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CA_COUNTIES, countyToCourtFinderUrl } from "@/lib/caCounties";
import {
  CaseIntake,
  EducationLevel,
  EmploymentStatus,
  EvidenceItem,
  EvidenceKind,
  EvidenceSide,
  FamilyLawRole,
  IncomeRange,
  IntakeTask,
  loadCase,
  newId,
  saveCase,
} from "@/lib/caseStore";

// ---------- IndexedDB (files) ----------
const DB_NAME = "thoxie_evidence_db";
const DB_VERSION = 1;
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: any) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string): Promise<any | null> {
  const db = await openDb();
  const val = await new Promise<any | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return val;
}

async function idbDel(key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
// --------------------------------------

const TASKS: { id: IntakeTask; title: string; subtitle: string }[] = [
  {
    id: "start_divorce",
    title: "Start a Divorce (I’m filing first)",
    subtitle: "You are starting the case. You have not been served papers.",
  },
  {
    id: "respond_papers",
    title: "Respond to Divorce Papers (I was served)",
    subtitle: "You received court papers and need to reply.",
  },
  {
    id: "prepare_hearing",
    title: "Prepare for a Court Hearing",
    subtitle: "You have a court date coming up and want to be ready.",
  },
  {
    id: "written_statement",
    title: "Explain Your Side to the Judge (Written Statement)",
    subtitle: "You need to put facts in writing for the court.",
  },
  {
    id: "triage",
    title: "Help me figure out what to do",
    subtitle: "Answer a few questions and THOXIE will guide you.",
  },
];

const ISSUE_TAGS = [
  { id: "children", label: "Children (custody / parenting time)" },
  { id: "support", label: "Support (child / spousal)" },
  { id: "property", label: "Property / debts" },
  { id: "safety", label: "Safety / restraining order" },
  { id: "other", label: "Other / not sure" },
] as const;

const EDUCATION: EducationLevel[] = [
  "Less than high school",
  "High school / GED",
  "Some college",
  "College degree",
  "Graduate degree",
];

const EMPLOYMENT: EmploymentStatus[] = [
  "Employed (office / professional)",
  "Employed (hourly / shift-based)",
  "Self-employed",
  "Not currently working",
  "Retired",
];

const INCOME: IncomeRange[] = [
  "Under $50,000",
  "$50,000–$100,000",
  "$100,000–$200,000",
  "Over $200,000",
  "Prefer not to say",
];

function labelForTask(t: IntakeTask) {
  switch (t) {
    case "start_divorce":
      return "Start a Divorce";
    case "respond_papers":
      return "Respond to Divorce Papers";
    case "prepare_hearing":
      return "Prepare for a Court Hearing";
    case "written_statement":
      return "Written Statement for the Judge";
    case "triage":
      return "Help me figure it out";
  }
}

function nowIso() {
  return new Date().toISOString();
}

export default function SignupPage() {
  const existing = useMemo(() => loadCase(), []);

  // Task
  const [task, setTask] = useState<IntakeTask>(existing?.task ?? "start_divorce");

  // Basics
  const [county, setCounty] = useState(existing?.county ?? "");
  const [role, setRole] = useState<FamilyLawRole>(existing?.role ?? "Petitioner");
  const [hasHearing, setHasHearing] = useState<boolean>(existing?.hasHearing ?? false);
  const [hearingDate, setHearingDate] = useState(existing?.hearingDateIso ?? "");

  // Demographics
  const [education, setEducation] = useState<EducationLevel | "">(existing?.education ?? "");
  const [employment, setEmployment] = useState<EmploymentStatus | "">(existing?.employment ?? "");
  const [income, setIncome] = useState<IncomeRange | "">(existing?.income ?? "");

  // Issues
  const [issues, setIssues] = useState<string[]>(existing?.issues ?? []);

  // Optional objective
  const [helpSummary, setHelpSummary] = useState(existing?.helpSummary ?? "");

  // Evidence
  const [evidence, setEvidence] = useState<EvidenceItem[]>(existing?.evidence ?? []);
  const [evSide, setEvSide] = useState<EvidenceSide>("mine");
  const [evKind, setEvKind] = useState<EvidenceKind>("file");
  const [evNotes, setEvNotes] = useState("");
  const [evTags, setEvTags] = useState<string[]>([]);
  const [evTextTitle, setEvTextTitle] = useState("");
  const [evTextBody, setEvTextBody] = useState("");
  const [evFiles, setEvFiles] = useState<FileList | null>(null);
  const [evBusy, setEvBusy] = useState(false);

  // Triage (2–4 Qs)
  const [triageServed, setTriageServed] = useState<"yes" | "no" | "">("");
  const [triageReceived, setTriageReceived] = useState<
    "divorce" | "hearing" | "statement" | "not_sure" | ""
  >("");
  const [triageCourtDate, setTriageCourtDate] = useState<"yes" | "no" | "">("");
  const [triageIssue, setTriageIssue] = useState<string>("");

  // AI panel (proactive guidance + quick actions + chat)
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{ who: "ai" | "user"; text: string }[]>([]);
  const [chatBusy, setChatBusy] = useState(false);

  // Refs to scroll
  const basicsRef = useRef<HTMLDivElement | null>(null);
  const evidenceRef = useRef<HTMLDivElement | null>(null);

  const courtLink = useMemo(() => (county ? countyToCourtFinderUrl(county) : ""), [county]);

  function persist(updatedEvidence: EvidenceItem[] = evidence) {
    const payload: CaseIntake = {
      id: existing?.id ?? newId("case"),
      createdAtIso: existing?.createdAtIso ?? nowIso(),
      task,
      county,
      role,
      hasHearing,
      hearingDateIso: hearingDate || undefined,
      helpSummary: helpSummary.trim() || undefined,
      education: education || undefined,
      employment: employment || undefined,
      income: income || undefined,
      issues: issues.length ? issues : undefined,
      evidence: updatedEvidence,
    };
    saveCase(payload);
  }

  function isDemographicsComplete() {
    return Boolean(education) && Boolean(employment);
  }

  function basicsComplete() {
    if (!county) return false;
    if (!isDemographicsComplete()) return false;
    if (task === "prepare_hearing" && hasHearing && !hearingDate) return false;
    return true;
  }

  function stepIndex(): 1 | 2 | 3 {
    if (!basicsComplete()) return 1;
    if (evidence.length === 0) return 2;
    return 3;
  }

  // Proactive “ASK THOXIE” messages based on state (no waiting)
  useEffect(() => {
    // Seed intro if empty
    if (chatLog.length > 0) return;

    const s = stepIndex();
    if (s === 1) {
      setChatLog([
        {
          who: "ai",
          text:
            "Start here: pick the task you’re trying to complete today, select your California county, and tell me your role (Petitioner/Respondent). Then I’ll guide you to the fastest next steps.",
        },
      ]);
      return;
    }
    if (s === 2) {
      setChatLog([
        {
          who: "ai",
          text:
            "Good. Next: upload 1–3 key documents (the papers you were served, a recent order, or a declaration draft). If you don’t have files, paste the text and I’ll structure it.",
        },
      ]);
      return;
    }
    setChatLog([
      {
        who: "ai",
        text:
          "Nice. You’re in a good place to generate an action plan and a first draft. Ask me what to file next, what to say, or what exhibits matter most.",
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, county, role, hasHearing, hearingDate, education, employment, income, issues, evidence.length]);

  // Persist on changes
  useEffect(() => {
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, county, role, hasHearing, hearingDate, education, employment, income, issues, helpSummary, evidence]);

  async function addEvidenceFromFiles(files: FileList) {
    if (!files?.length) return;
    setEvBusy(true);
    try {
      const newItems: EvidenceItem[] = [];

      for (const f of Array.from(files)) {
        const id = newId("ev");
        const key = `file:${id}:${f.name}`;
        const buf = await f.arrayBuffer();
        await idbPut(key, {
          name: f.name,
          type: f.type || "application/octet-stream",
          size: f.size,
          data: buf,
          savedAtIso: nowIso(),
        });

        newItems.push({
          id,
          side: evSide,
          kind: "file",
          title: f.name,
          notes: evNotes.trim() || undefined,
          tags: evTags.length ? evTags : undefined,
          fileKey: key,
          createdAtIso: nowIso(),
        });
      }

      const updated = [...evidence, ...newItems];
      setEvidence(updated);
      setEvFiles(null);
      setEvNotes("");
      setEvTags([]);
      persist(updated);
    } finally {
      setEvBusy(false);
    }
  }

  async function addEvidenceText() {
    const title = evTextTitle.trim();
    const body = evTextBody.trim();
    if (!title || !body) return;
    setEvBusy(true);
    try {
      const id = newId("ev");
      const updated: EvidenceItem[] = [
        ...evidence,
        {
          id,
          side: evSide,
          kind: "text",
          title,
          notes: evNotes.trim() || undefined,
          tags: evTags.length ? evTags : undefined,
          text: body,
          createdAtIso: nowIso(),
        },
      ];
      setEvidence(updated);
      setEvTextTitle("");
      setEvTextBody("");
      setEvNotes("");
      setEvTags([]);
      persist(updated);
    } finally {
      setEvBusy(false);
    }
  }

  async function downloadEvidenceFile(item: EvidenceItem) {
    if (!item.fileKey) return;
    const record = await idbGet(item.fileKey);
    if (!record?.data) return;

    const blob = new Blob([record.data], { type: record.type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = record.name || item.title || "evidence";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function deleteEvidence(item: EvidenceItem) {
    if (item.fileKey) await idbDel(item.fileKey);
    const updated = evidence.filter((e) => e.id !== item.id);
    setEvidence(updated);
    persist(updated);
  }

  function toggleIssue(id: string) {
    setIssues((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Triage: map 2–4 Qs into task selection
  useEffect(() => {
    if (task !== "triage") return;
    if (!triageServed) return;

    if (triageServed === "no") {
      setTask("start_divorce");
      return;
    }

    if (!triageReceived) return;

    if (triageReceived === "divorce") setTask("respond_papers");
    else if (triageReceived === "hearing") setTask("prepare_hearing");
    else if (triageReceived === "statement") setTask("written_statement");
    else setTask("respond_papers");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, triageServed, triageReceived]);

  async function sendChat() {
    if (!chatInput.trim() || chatBusy) return;

    const message = chatInput.trim();
    setChatInput("");
    setChatBusy(true);
    setChatLog((l) => [...l, { who: "user", text: message }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            task,
            county,
            role,
            hasHearing,
            hearingDate,
            education,
            employment,
            income,
            issues,
            evidenceCount: evidence.length,
          },
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg =
          typeof json?.reply === "string" && json.reply.trim()
            ? json.reply.trim()
            : "Server error. Try again.";
        throw new Error(msg);
      }

      const reply =
        typeof json?.reply === "string" && json.reply.trim()
          ? json.reply.trim()
          : "No reply returned. Try again.";

      setChatLog((l) => [...l, { who: "ai", text: reply }]);
    } catch (err: any) {
      setChatLog((l) => [
        ...l,
        { who: "ai", text: err?.message || "Error connecting. Try again." },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT */}
        <section className="lg:col-span-7">
          <h1 className="text-3xl font-extrabold">Start Free</h1>
          <p className="mt-2 text-sm text-zinc-700">
            California Family Law · Not a law firm · No legal advice
          </p>

          {/* STEP 1: Task */}
          <div className="mt-8 rounded-2xl border border-zinc-200 p-6">
            <div className="text-sm font-semibold">Step 1 of 3 — Choose what you need to do</div>
            <div className="mt-1 text-xs text-zinc-600">
              Pick the option that matches what you’re trying to get done today.
            </div>

            <div className="mt-4 space-y-3">
              {TASKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTask(t.id)}
                  className={`w-full rounded-2xl border p-4 text-left ${
                    task === t.id
                      ? "bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  <div className="text-sm font-semibold">{t.title}</div>
                  <div className={`mt-1 text-xs ${task === t.id ? "text-zinc-200" : "text-zinc-600"}`}>
                    {t.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Basics */}
          <div ref={basicsRef} className="mt-8 rounded-2xl border border-zinc-200 p-6">
            <div className="text-sm font-semibold">Basics</div>
            <div className="mt-1 text-xs text-zinc-600">
              These are required so THOXIE can route you correctly.
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">California county</label>
                <select
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {CA_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {courtLink ? (
                  <div className="mt-2 text-xs">
                    <a className="underline" href={courtLink} target="_blank" rel="noreferrer">
                      Find your court / filing info
                    </a>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-semibold">Your role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as FamilyLawRole)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="Petitioner">Petitioner (I filed first)</option>
                  <option value="Respondent">Respondent (I was served)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Education (required)</label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {EDUCATION.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Employment (required)</label>
                <select
                  value={employment}
                  onChange={(e) => setEmployment(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {EMPLOYMENT.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Income (optional)</label>
                <select
                  value={income}
                  onChange={(e) => setIncome(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {INCOME.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Do you have a hearing date?</label>
                <div className="mt-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hasHearing}
                      onChange={(e) => setHasHearing(e.target.checked)}
                    />
                    Yes
                  </label>
                </div>

                {task === "prepare_hearing" && hasHearing ? (
                  <div className="mt-3">
                    <label className="text-xs font-semibold">Hearing date (ISO / YYYY-MM-DD)</label>
                    <input
                      value={hearingDate}
                      onChange={(e) => setHearingDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold">What is this about?</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ISSUE_TAGS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggleIssue(t.id)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      issues.includes(t.id) ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold">What outcome do you want? (optional)</label>
                <textarea
                  value={helpSummary}
                  onChange={(e) => setHelpSummary(e.target.value)}
                  placeholder="Example: I want a clean response to an RFO and a declaration that is organized and believable."
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div ref={evidenceRef} className="mt-8 rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Step 2 of 3 — Evidence Vault</div>
                <div className="mt-1 text-xs text-zinc-600">
                  Upload documents or paste text. THOXIE will help you organize and draft.
                </div>
              </div>
              <Link href="/" className="text-xs underline">
                Back to home
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">Whose evidence is this?</label>
                <select
                  value={evSide}
                  onChange={(e) => setEvSide(e.target.value as EvidenceSide)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="mine">Mine</option>
                  <option value="theirs">Other party</option>
                  <option value="neutral">Neutral / court / third party</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Evidence type</label>
                <select
                  value={evKind}
                  onChange={(e) => setEvKind(e.target.value as EvidenceKind)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="file">File upload</option>
                  <option value="text">Paste text</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">Notes (optional)</label>
                <input
                  value={evNotes}
                  onChange={(e) => setEvNotes(e.target.value)}
                  placeholder="Example: This shows the false statement about income; look at page 3."
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">Tags (optional)</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["custody", "support", "property", "fees", "credibility", "timeline", "other"].map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        setEvTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        evTags.includes(t) ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {evKind === "file" ? (
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold">Upload files</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setEvFiles(e.target.files)}
                    className="mt-2 block w-full text-sm"
                  />
                  <button
                    disabled={!evFiles?.length || evBusy}
                    onClick={() => evFiles && addEvidenceFromFiles(evFiles)}
                    className="mt-3 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {evBusy ? "Saving…" : "Add to Evidence Vault"}
                  </button>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold">Title</label>
                  <input
                    value={evTextTitle}
                    onChange={(e) => setEvTextTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                    placeholder="Example: Opposing declaration excerpt re: custody"
                  />
                  <label className="mt-3 block text-xs font-semibold">Text</label>
                  <textarea
                    value={evTextBody}
                    onChange={(e) => setEvTextBody(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                    rows={7}
                    placeholder="Paste text here…"
                  />
                  <button
                    disabled={!evTextTitle.trim() || !evTextBody.trim() || evBusy}
                    onClick={addEvidenceText}
                    className="mt-3 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {evBusy ? "Saving…" : "Add text evidence"}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-8">
              <div className="text-sm font-semibold">Your Evidence</div>
              <div className="mt-2 text-xs text-zinc-600">
                {evidence.length ? `${evidence.length} item(s)` : "No evidence yet. Add at least 1 item to unlock Step 3."}
              </div>

              <div className="mt-4 space-y-3">
                {evidence.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-zinc-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="mt-1 text-xs text-zinc-600">
                          Side: {item.side} · Type: {item.kind}
                          {item.tags?.length ? ` · Tags: ${item.tags.join(", ")}` : ""}
                        </div>
                        {item.notes ? (
                          <div className="mt-2 text-xs text-zinc-700">{item.notes}</div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.kind === "file" ? (
                          <button
                            onClick={() => downloadEvidenceFile(item)}
                            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
                          >
                            Download
                          </button>
                        ) : null}
                        <button
                          onClick={() => deleteEvidence(item)}
                          className="rounded-xl border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {item.kind === "text" && item.text ? (
                      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-xs text-zinc-800">
                        {item.text}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: ASK THOXIE */}
        <aside className="lg:col-span-5">
          <div className="sticky top-6 rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">ASK THOXIE</div>
                <div className="mt-1 text-xs text-zinc-600">
                  Decision-support · No legal advice · California family law
                </div>
              </div>
              <div className="text-xs text-zinc-600">
                Step {stepIndex()} / 3
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-700">Context</div>
              <div className="mt-2 space-y-1 text-xs text-zinc-700">
                <div>Task: {labelForTask(task)}</div>
                <div>County: {county || "—"}</div>
                <div>Role: {role}</div>
                <div>Evidence: {evidence.length}</div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="max-h-80 overflow-auto rounded-2xl border border-zinc-200 bg-white p-3">
                {chatLog.length ? (
                  <div className="space-y-3">
                    {chatLog.map((m, i) => (
                      <div key={i} className="text-sm">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                          {m.who === "ai" ? "THOXIE" : "You"}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{m.text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600">Ask a question to begin.</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendChat();
                  }}
                  placeholder="Ask THOXIE…"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                />
                <button
                  onClick={sendChat}
                  disabled={chatBusy || !chatInput.trim()}
                  className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {chatBusy ? "…" : "Send"}
                </button>
              </div>

              <div className="text-[11px] text-zinc-600">
                THOXIE provides decision-support and preparation help. It does not provide legal advice.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
