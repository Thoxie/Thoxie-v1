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
  const [triageReceived, setTriageReceived] = useState<"divorce" | "hearing" | "statement" | "not_sure" | "">("");
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
    const msgs: string[] = [];

    // Task selected
    msgs.push(`You selected: ${labelForTask(task)}.`);

    // If triage, guide triage first
    if (task === "triage") {
      msgs.push("Answer the questions below. I will guide you to the right task.");
    } else {
      // Step guidance
      const s = stepIndex();
      msgs.push(`Step ${s} of 3: ${s === 1 ? "Basics" : s === 2 ? "Add evidence" : "Next steps"}.`);
    }

    // Task-specific guidance
    if (task === "start_divorce") {
      if (!county) msgs.push("First: choose your California county.");
      else if (!isDemographicsComplete()) msgs.push("Next: answer the education and employment questions so I can tailor guidance.");
      else if (issues.length === 0) msgs.push("Next: select what issues apply (children, support, property, safety).");
      else msgs.push("Next: add your key documents. If you only add 3 items, add court papers, financial basics, and messages that support your key points.");
    }

    if (task === "respond_papers") {
      if (!county) msgs.push("First: choose your California county.");
      else if (!isDemographicsComplete()) msgs.push("Next: answer education and employment so I can explain steps at the right level.");
      else msgs.push("Next: upload what the other party filed (their papers). That is the best place to start.");
    }

    if (task === "prepare_hearing") {
      if (!county) msgs.push("First: choose your California county.");
      else if (!isDemographicsComplete()) msgs.push("Next: answer education and employment so I can keep instructions clear and simple.");
      else if (hasHearing && !hearingDate) msgs.push("Next: enter your hearing date.");
      else msgs.push("Next: upload the papers related to your hearing and any messages or documents that support your main points.");
    }

    if (task === "written_statement") {
      msgs.push("A written statement is a clear explanation of what happened, in your own words.");
      msgs.push("Examples: explaining your side, responding to claims, supporting a hearing or request.");
      if (!county) msgs.push("First: choose your California county.");
      else if (!isDemographicsComplete()) msgs.push("Next: answer education and employment so I can write at the right level.");
      else msgs.push("Next: upload or paste the documents/messages you want to refer to.");
    }

    // Set the AI “guide” content as the first messages (replace, don’t endlessly add)
    setChatLog((prev) => {
      const userMsgs = prev.filter((m) => m.who === "user"); // keep user questions if any
      const aiGuide = msgs.map((t) => ({ who: "ai" as const, text: t }));
      return [...aiGuide, ...userMsgs].slice(0, 12);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, county, education, employment, issues, evidence.length, hasHearing, hearingDate]);

  function toggleIssue(id: string) {
    setIssues((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleEvTag(tag: string) {
    setEvTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function addEvidence() {
    setEvBusy(true);
    try {
      const newItems: EvidenceItem[] = [];

      if (evKind === "text") {
        if (!evTextBody.trim()) {
          alert("Paste some text first.");
          return;
        }
        const id = newId("ev");
        newItems.push({
          id,
          side: evSide,
          kind: "text",
          textTitle: evTextTitle.trim() || "Pasted text",
          textBody: evTextBody,
          notes: evNotes.trim() || undefined,
          issueTags: evTags.length ? evTags : undefined,
          createdAtIso: nowIso(),
        });
        setEvTextTitle("");
        setEvTextBody("");
      }

      if (evKind === "file") {
        if (!evFiles || evFiles.length === 0) {
          alert("Choose at least one file to upload.");
          return;
        }

        for (const file of Array.from(evFiles)) {
          const id = newId("ev");
          const dbKey = `file_${id}`;

          await idbPut(dbKey, {
            name: file.name,
            type: file.type,
            size: file.size,
            blob: file,
            savedAtIso: nowIso(),
          });

          newItems.push({
            id,
            side: evSide,
            kind: "file",
            fileName: file.name,
            fileType: file.type || undefined,
            fileSize: file.size,
            dbKey,
            notes: evNotes.trim() || undefined,
            issueTags: evTags.length ? evTags : undefined,
            createdAtIso: nowIso(),
          });
        }
        setEvFiles(null);
      }

      const updated = [...evidence, ...newItems];
      setEvidence(updated);
      persist(updated);

      setEvNotes("");
      setEvTags([]);
      alert("Evidence saved.");
    } finally {
      setEvBusy(false);
    }
  }

  async function downloadEvidence(item: EvidenceItem) {
    if (item.kind !== "file" || !item.dbKey) return;

    const stored = await idbGet(item.dbKey);
    if (!stored?.blob) {
      alert("File not found in local storage.");
      return;
    }

    const blob: Blob = stored.blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.fileName || "evidence";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function deleteEvidence(item: EvidenceItem) {
    if (!confirm("Delete this evidence item?")) return;

    if (item.kind === "file" && item.dbKey) await idbDel(item.dbKey);

    const updated = evidence.filter((e) => e.id !== item.id);
    setEvidence(updated);
    persist(updated);
  }

  function saveCaseNow() {
    persist(evidence);
    alert("Saved.");
  }

  function scrollToBasics() {
    basicsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToEvidence() {
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // If triage answers are complete, route to a task
  useEffect(() => {
    if (task !== "triage") return;

    // Need at least Q1
    if (!triageServed) return;

    if (triageServed === "no") {
      // If not served, usually start divorce
      setTask("start_divorce");
      return;
    }

    // served === yes
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

    // Keep this endpoint, but keep the product focus in the UI and prompts.
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

      const json = await res.json();
      setChatLog((l) => [...l, { who: "ai", text: json.reply }]);
    } catch {
      setChatLog((l) => [...l, { who: "ai", text: "Error connecting. Try again." }]);
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
                    task === t.id ? "bg-zinc-950 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-sm opacity-80">{t.subtitle}</div>
                  {t.id === "written_statement" && (
                    <div className="mt-2 text-xs opacity-80">
                      Examples: explaining your side · responding to claims · supporting a hearing or request
                    </div>
                  )}
                </button>
              ))}
            </div>

            {task === "triage" && (
              <div className="mt-6 rounded-2xl border border-zinc-200 p-4">
                <div className="text-sm font-semibold">Quick questions</div>
                <div className="mt-2 text-xs text-zinc-600">
                  Answer these and THOXIE will route you to the right task.
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-xs font-semibold">Have you already received court papers from the other party?</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setTriageServed("yes")}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          triageServed === "yes" ? "bg-zinc-950 text-white" : "border bg-white"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setTriageServed("no")}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          triageServed === "no" ? "bg-zinc-950 text-white" : "border bg-white"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {triageServed === "yes" && (
                    <div>
                      <div className="text-xs font-semibold">What did you receive?</div>
                      <select
                        value={triageReceived}
                        onChange={(e) => setTriageReceived(e.target.value as any)}
                        className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                      >
                        <option value="">Select one…</option>
                        <option value="divorce">Divorce papers</option>
                        <option value="hearing">A request for a hearing</option>
                        <option value="statement">A written statement</option>
                        <option value="not_sure">Not sure</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold">Do you have a court date scheduled right now?</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setTriageCourtDate("yes")}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          triageCourtDate === "yes" ? "bg-zinc-950 text-white" : "border bg-white"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setTriageCourtDate("no")}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          triageCourtDate === "no" ? "bg-zinc-950 text-white" : "border bg-white"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold">What is the main issue involved? (optional)</div>
                    <input
                      value={triageIssue}
                      onChange={(e) => setTriageIssue(e.target.value)}
                      placeholder="Example: custody, support, property"
                      className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Basics + demographics */}
          <div ref={basicsRef} className="mt-6 rounded-2xl border border-zinc-200 p-6">
            <div className="text-sm font-semibold">Step 2 of 3 — Case basics</div>
            <div className="mt-1 text-xs text-zinc-600">
              Fill these in first. THOXIE uses them to guide you.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <div className="text-xs font-semibold">County</div>
                <select
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="">Select a county…</option>
                  {CA_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {county && (
                  <div className="mt-2 text-xs">
                    <a href={courtLink} target="_blank" rel="noreferrer" className="underline">
                      Find your court
                    </a>
                  </div>
                )}
              </label>

              <label>
                <div className="text-xs font-semibold">Your role</div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as FamilyLawRole)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="Petitioner">Petitioner</option>
                  <option value="Respondent">Respondent</option>
                  <option value="Other/Not sure">Other / Not sure</option>
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-semibold">About you (required)</div>
              <div className="mt-1 text-xs text-zinc-600">
                This helps THOXIE explain steps clearly and at the right level.
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <div className="text-xs font-semibold">Education level</div>
                  <select
                    value={education}
                    onChange={(e) => setEducation(e.target.value as any)}
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {EDUCATION.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div className="text-xs font-semibold">Employment</div>
                  <select
                    value={employment}
                    onChange={(e) => setEmployment(e.target.value as any)}
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {EMPLOYMENT.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4">
                <label>
                  <div className="text-xs font-semibold">Household income (optional)</div>
                  <select
                    value={income}
                    onChange={(e) => setIncome(e.target.value as any)}
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {INCOME.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold">Do you have a hearing scheduled?</div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setHasHearing(true)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    hasHearing ? "bg-zinc-950 text-white" : "border bg-white"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setHasHearing(false)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    !hasHearing ? "bg-zinc-950 text-white" : "border bg-white"
                  }`}
                >
                  No
                </button>
              </div>

              {hasHearing && (
                <div className="mt-3">
                  <div className="text-xs font-semibold">Hearing date</div>
                  <input
                    type="date"
                    value={hearingDate}
                    onChange={(e) => setHearingDate(e.target.value)}
                    className="mt-2 rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold">What issues apply? (select all that apply)</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ISSUE_TAGS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => toggleIssue(x.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      issues.includes(x.id) ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-6 block">
              <div className="text-xs font-semibold">Optional: Your one-sentence goal (saved)</div>
              <div className="mt-1 text-xs text-zinc-600">
                Use ASK THOXIE for questions. This is just a saved goal for your case.
              </div>
              <textarea
                rows={3}
                value={helpSummary}
                onChange={(e) => setHelpSummary(e.target.value)}
                placeholder="Example: I’m filing first and I want a simple checklist and the first forms I need."
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={saveCaseNow}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Save
              </button>
              <button
                onClick={scrollToEvidence}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Next: Add evidence
              </button>
              <Link href="/" className="text-sm underline">
                Back to home
              </Link>
            </div>
          </div>

          {/* STEP 3: Evidence */}
          <div ref={evidenceRef} className="mt-6 rounded-2xl border border-zinc-200 p-6">
            <div className="text-sm font-semibold">Step 3 of 3 — Add your evidence</div>
            <div className="mt-1 text-xs text-zinc-600">
              Upload files or paste text. Label it clearly so THOXIE can help you use it.
            </div>
{/* OUTPUT: First Filing Pack (v1 preview) */}
<div className="mt-6 rounded-2xl border border-zinc-200 p-6">
  <div className="text-sm font-semibold">Your First Filing Pack (Preview)</div>
  <div className="mt-1 text-xs text-zinc-600">
    This is a plain-English checklist of what people typically prepare first, based on what you selected.
  </div>

  <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800">
    <div className="text-xs font-semibold text-zinc-600">Based on your selections:</div>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
      <li><span className="font-semibold">Task:</span> {labelForTask(task)}</li>
      <li><span className="font-semibold">County:</span> {county || "Not selected yet"}</li>
      <li><span className="font-semibold">Role:</span> {role}</li>
      <li><span className="font-semibold">Issues:</span> {issues.length ? issues.join(", ") : "Not selected yet"}</li>
      <li><span className="font-semibold">Evidence saved:</span> {evidence.length}</li>
      {hasHearing ? (
        <li><span className="font-semibold">Hearing date:</span> {hearingDate || "Not entered yet"}</li>
      ) : null}
    </ul>

    <div className="mt-4 text-xs font-semibold text-zinc-600">Recommended order (simple):</div>
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
      <li>Confirm your county and role.</li>
      <li>Upload key documents (other party papers first if you’re responding).</li>
      <li>Build a clean timeline (dates + what happened).</li>
      <li>Create your “Written Statement for the Judge” draft (if needed).</li>
      <li>Prepare hearing talking points if you have a court date.</li>
    </ol>

    <div className="mt-4 text-xs font-semibold text-zinc-600">What THOXIE will produce next (coming next step):</div>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
      <li>Hearing Prep Pack: talking points + evidence checklist + timeline</li>
      <li>Written Statement Pack: facts outline + exhibit placeholders</li>
      <li>Response Pack: what you’re responding to + key points to address</li>
      <li>Start Pack: first steps + a clean to-do list</li>
    </ul>

    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <span className="font-semibold">Note:</span> This is preparation guidance, not legal advice. You make the decisions.
    </div>
  </div>

  <div className="mt-4 text-xs text-zinc-600">
    Next: we’ll turn this preview into a real “Generate Pack” button that creates a downloadable output (PDF later).
  </div>
</div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <div className="text-xs font-semibold">Which side is this from?</div>
                <select
                  value={evSide}
                  onChange={(e) => setEvSide(e.target.value as EvidenceSide)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="mine">Your documents</option>
                  <option value="other_party">Other party documents</option>
                </select>
              </label>

              <label>
                <div className="text-xs font-semibold">What are you adding?</div>
                <select
                  value={evKind}
                  onChange={(e) => setEvKind(e.target.value as EvidenceKind)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="file">Upload file(s)</option>
                  <option value="text">Paste text (email, messages, notes)</option>
                </select>
              </label>
            </div>

            {evKind === "file" ? (
              <div className="mt-4">
                <div className="text-xs font-semibold">Upload files</div>
                <div className="mt-1 text-xs text-zinc-600">
                  PDF, Word, images, TXT. Saved on this device (Phase 1).
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setEvFiles(e.target.files)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <div className="text-xs font-semibold">Title (optional)</div>
                  <input
                    value={evTextTitle}
                    onChange={(e) => setEvTextTitle(e.target.value)}
                    placeholder="Example: Email thread about parenting schedule"
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-semibold">Paste text</div>
                  <textarea
                    value={evTextBody}
                    onChange={(e) => setEvTextBody(e.target.value)}
                    placeholder="Paste email text, messages, notes…"
                    rows={6}
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}

            <div className="mt-4">
              <div className="text-xs font-semibold">Tags (optional)</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ISSUE_TAGS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleEvTag(t.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      evTags.includes(t.id) ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <div className="text-xs font-semibold">Notes (optional)</div>
              <input
                value={evNotes}
                onChange={(e) => setEvNotes(e.target.value)}
                placeholder="Why it matters / what it proves"
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={addEvidence}
                disabled={evBusy}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  evBusy ? "bg-zinc-200 text-zinc-500" : "bg-zinc-950 text-white hover:bg-zinc-800"
                }`}
              >
                {evBusy ? "Saving…" : "Add evidence"}
              </button>
              <div className="text-xs text-zinc-600">Items saved: {evidence.length}</div>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-semibold">Saved evidence</div>

              {evidence.length === 0 ? (
                <div className="mt-2 text-sm text-zinc-600">
                  No evidence yet. Upload files or paste text above.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {evidence.slice().reverse().map((item) => (
                    <div key={item.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {item.kind === "file" ? item.fileName : item.textTitle || "Pasted text"}
                          </div>
                          <div className="mt-1 text-xs text-zinc-600">
                            {item.side === "mine" ? "Your documents" : "Other party documents"} ·{" "}
                            {item.kind === "file"
                              ? `${item.fileType || "file"}${item.fileSize ? ` · ${Math.round(item.fileSize / 1024)} KB` : ""}`
                              : "text"}
                          </div>
                          {item.notes && <div className="mt-1 text-xs text-zinc-700">Notes: {item.notes}</div>}
                        </div>

                        <div className="flex shrink-0 flex-col gap-2">
                          {item.kind === "file" ? (
                            <button
                              onClick={() => downloadEvidence(item)}
                              className="rounded-xl border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
                            >
                              Download
                            </button>
                          ) : null}

                          <button
                            onClick={() => deleteEvidence(item)}
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {item.kind === "text" && item.textBody ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
                            View pasted text
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-800">
                            {item.textBody}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <span className="font-semibold">Important:</span> THOXIE is not a law firm and does not provide legal advice.
            It is a legal support and preparation tool.
          </div>
        </section>

        {/* RIGHT — ASK THOXIE (Always visible / sticky) */}
        <aside className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">ASK THOXIE</div>
                <div className="mt-1 text-xs text-zinc-600">
                  I guide you step by step. I focus on your legal task.
                </div>
              </div>

              <div className="text-right text-xs text-zinc-600">
                <div className="font-semibold">Progress</div>
                <div>Step {stepIndex()} / 3</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={scrollToBasics}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
              >
                Go to basics
              </button>
              <button
                onClick={scrollToEvidence}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
              >
                Go to evidence
              </button>
              <button
                onClick={saveCaseNow}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
              >
                Save
              </button>
            </div>

            <div className="mt-4 h-[420px] overflow-auto rounded-xl border p-3">
              {chatLog.length === 0 ? (
                <div className="text-sm text-zinc-600">
                  Start by selecting a task on the left.
                </div>
              ) : (
                chatLog.map((m, i) => (
                  <div
                    key={i}
                    className={`mb-2 rounded-xl px-3 py-2 text-sm ${
                      m.who === "ai" ? "bg-zinc-50" : "bg-zinc-950 text-white"
                    }`}
                  >
                    {m.text}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Ask a case-prep question…"
                className="flex-1 rounded-xl border px-3 py-2 text-sm"
              />
              <button
                onClick={sendChat}
                disabled={chatBusy}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Send
              </button>
            </div>

            <div className="mt-3 text-xs text-zinc-600">
              Tip: If you were served papers, upload what the other party filed under “Other party documents.”
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

