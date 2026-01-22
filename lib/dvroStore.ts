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
import { loadCaseType } from "@/lib/caseTypes";

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

const TASKS: { id: IntakeTask; label: string; desc: string }[] = [
  {
    id: "start",
    label: "Start a Case",
    desc: "I need to file first / begin the process.",
  },
  {
    id: "respond",
    label: "Respond to Papers",
    desc: "I was served and need to respond.",
  },
  {
    id: "hearing",
    label: "Prepare for Hearing",
    desc: "I have a hearing coming up.",
  },
  {
    id: "explain",
    label: "Explain My Side",
    desc: "I need a judge-ready narrative and exhibits plan.",
  },
  {
    id: "figure_out",
    label: "Help Me Figure It Out",
    desc: "Not sure what to do; I need options and next steps.",
  },
];

const EDUCATION: { id: EducationLevel; label: string }[] = [
  { id: "hs", label: "High school" },
  { id: "some_college", label: "Some college" },
  { id: "ba", label: "BA/BS" },
  { id: "ma", label: "MA/MS/MBA" },
  { id: "jd_md_phd", label: "JD/MD/PhD" },
];

const EMPLOYMENT: { id: EmploymentStatus; label: string }[] = [
  { id: "employed", label: "Employed" },
  { id: "self_employed", label: "Self-employed" },
  { id: "unemployed", label: "Unemployed" },
  { id: "retired", label: "Retired" },
  { id: "student", label: "Student" },
];

const INCOME: { id: IncomeRange; label: string }[] = [
  { id: "under_50", label: "Under $50k" },
  { id: "50_100", label: "$50k–$100k" },
  { id: "100_200", label: "$100k–$200k" },
  { id: "200_500", label: "$200k–$500k" },
  { id: "500_plus", label: "$500k+" },
  { id: "prefer_not", label: "Prefer not to say" },
];

const ROLES: { id: FamilyLawRole; label: string }[] = [
  { id: "petitioner", label: "Petitioner (I filed / will file)" },
  { id: "respondent", label: "Respondent (I was served)" },
  { id: "unsure", label: "Not sure" },
];

const KINDS: { id: EvidenceKind; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "text", label: "Text message" },
  { id: "photo", label: "Photo" },
  { id: "video", label: "Video" },
  { id: "pdf", label: "PDF" },
  { id: "other", label: "Other" },
];

type ChatMsg = { who: "user" | "ai"; text: string };

function formatDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function SignupFlow() {
  const [hydrated, setHydrated] = useState(false);

  // intake state
  const [task, setTask] = useState<IntakeTask>("start");
  const [county, setCounty] = useState<string>("San Mateo");
  const [role, setRole] = useState<FamilyLawRole>("unsure");
  const [hasHearing, setHasHearing] = useState<boolean>(false);
  const [hearingDate, setHearingDate] = useState<string>("");
  const [education, setEducation] = useState<EducationLevel>("ba");
  const [employment, setEmployment] = useState<EmploymentStatus>("employed");
  const [income, setIncome] = useState<IncomeRange>("prefer_not");
  const [issues, setIssues] = useState<string>("");

  // evidence
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // chat
  const [chatLog, setChatLog] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  // load persisted intake
  useEffect(() => {
    const saved = loadCase();
    if (saved) {
      setTask(saved.task);
      setCounty(saved.county);
      setRole(saved.role);
      setHasHearing(saved.hasHearing);
      setHearingDate(saved.hearingDate ?? "");
      setEducation(saved.education);
      setEmployment(saved.employment);
      setIncome(saved.income);
      setIssues(saved.issues ?? "");
      setEvidence(saved.evidence ?? []);
    }
    setHydrated(true);
  }, []);

  // persist on changes (lightweight)
  useEffect(() => {
    if (!hydrated) return;
    const next: CaseIntake = {
      version: 1,
      task,
      county,
      role,
      hasHearing,
      hearingDate,
      education,
      employment,
      income,
      issues,
      evidence,
    };
    saveCase(next);
  }, [
    hydrated,
    task,
    county,
    role,
    hasHearing,
    hearingDate,
    education,
    employment,
    income,
    issues,
    evidence,
  ]);

  const courtFinderUrl = useMemo(() => countyToCourtFinderUrl(county), [county]);

  async function onAddEvidence(files: FileList | null) {
    if (!files || files.length === 0) return;

    const max = 25;
    const picked = Array.from(files).slice(0, max);

    const newItems: EvidenceItem[] = [];
    for (const f of picked) {
      const id = newId();
      const item: EvidenceItem = {
        id,
        kind: guessKind(f),
        side: "me",
        title: f.name,
        notes: "",
        createdAt: new Date().toISOString(),
        fileRef: id,
      };
      await idbPut(id, f);
      newItems.push(item);
    }

    setEvidence((prev) => [...newItems, ...prev]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onRemoveEvidence(id: string) {
    setEvidence((prev) => prev.filter((e) => e.id !== id));
    await idbDel(id);
  }

  function guessKind(f: File): EvidenceKind {
    const name = f.name.toLowerCase();
    if (name.endsWith(".pdf")) return "pdf";
    if (name.match(/\.(png|jpg|jpeg|webp|gif)$/)) return "photo";
    if (name.match(/\.(mp4|mov|m4v|webm)$/)) return "video";
    if (name.match(/\.(eml|msg)$/)) return "email";
    return "other";
  }

  function setEvidenceField(id: string, patch: Partial<EvidenceItem>) {
    setEvidence((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function onChatSend() {
    if (!chatInput.trim() || chatBusy) return;

    const message = chatInput.trim();

    // Build a bounded history for a real discussion (last 12 messages).
    const nextHistory = [...chatLog, { who: "user" as const, text: message }];
    const historyToSend = nextHistory.slice(-12).map((m) => ({
      role: m.who === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));

    setChatInput("");
    setChatBusy(true);
    setChatLog(nextHistory);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: historyToSend,
          context: {
            caseType: loadCaseType(), // ✅ NEW: drives DVRO/family-law guardrails
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
            : `Server error (${res.status})`;
        setChatLog((prev) => [...prev, { who: "ai", text: msg }]);
        return;
      }

      const reply =
        typeof json?.reply === "string" && json.reply.trim()
          ? json.reply.trim()
          : "LIVE-AI: (No response text returned.)";

      setChatLog((prev) => [...prev, { who: "ai", text: reply }]);
    } catch (e: any) {
      setChatLog((prev) => [
        ...prev,
        { who: "ai", text: `LIVE-AI: Network error: ${e?.message ?? "unknown"}` },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  // --- UI ---
  const today = useMemo(() => formatDateInput(new Date()), []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-950">
          Start Free — Build your first filing pack
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Not a law firm. No legal advice. Decision-support + preparation tools for California.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT: Intake */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Case intake</h2>

          <div className="mt-5 grid gap-4">
            {/* Task */}
            <div>
              <label className="text-sm font-medium text-zinc-900">What do you need?</label>
              <div className="mt-2 grid gap-2">
                {TASKS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTask(t.id)}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      task === t.id
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className={`text-xs ${task === t.id ? "text-white/80" : "text-zinc-600"}`}>
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* County */}
            <div>
              <label className="text-sm font-medium text-zinc-900">County</label>
              <select
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              >
                {CA_COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-zinc-600">
                Court finder:{" "}
                <a
                  className="underline hover:text-zinc-950"
                  href={courtFinderUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open county court website
                </a>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-sm font-medium text-zinc-900">Your role</label>
              <select
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as FamilyLawRole)}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hearing */}
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">Do you have a hearing date?</div>
                  <div className="text-xs text-zinc-600">
                    If yes, we’ll prep a hearing outline and judge-ready bullets.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hasHearing}
                  onChange={(e) => setHasHearing(e.target.checked)}
                  className="h-5 w-5"
                />
              </div>
              {hasHearing && (
                <div className="mt-3">
                  <label className="text-xs font-medium text-zinc-700">Hearing date</label>
                  <input
                    type="date"
                    min={today}
                    value={hearingDate}
                    onChange={(e) => setHearingDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Education + Employment + Income */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-zinc-900">Education</label>
                <select
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={education}
                  onChange={(e) => setEducation(e.target.value as EducationLevel)}
                >
                  {EDUCATION.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-900">Employment</label>
                <select
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={employment}
                  onChange={(e) => setEmployment(e.target.value as EmploymentStatus)}
                >
                  {EMPLOYMENT.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-900">Income</label>
                <select
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={income}
                  onChange={(e) => setIncome(e.target.value as IncomeRange)}
                >
                  {INCOME.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Issues */}
            <div>
              <label className="text-sm font-medium text-zinc-900">
                What’s going on? (short)
              </label>
              <textarea
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                rows={4}
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                placeholder="Facts, dates, what you want the court to do."
              />
            </div>

            {/* Evidence */}
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-950">Evidence</div>
                  <div className="text-xs text-zinc-600">
                    Upload files (stored locally in your browser).
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => onAddEvidence(e.target.files)}
                  className="text-sm"
                />
              </div>

              <div className="mt-4 grid gap-3">
                {evidence.length === 0 ? (
                  <div className="text-sm text-zinc-600">No evidence uploaded yet.</div>
                ) : (
                  evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-zinc-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-950">
                            {ev.title}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <select
                              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs"
                              value={ev.kind}
                              onChange={(e) =>
                                setEvidenceField(ev.id, {
                                  kind: e.target.value as EvidenceKind,
                                })
                              }
                            >
                              {KINDS.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.label}
                                </option>
                              ))}
                            </select>

                            <select
                              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs"
                              value={ev.side}
                              onChange={(e) =>
                                setEvidenceField(ev.id, {
                                  side: e.target.value as EvidenceSide,
                                })
                              }
                            >
                              <option value="me">My evidence</option>
                              <option value="them">Other party</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveEvidence(ev.id)}
                          className="rounded-lg border border-zinc-200 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                        >
                          Remove
                        </button>
                      </div>

                      <textarea
                        className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                        rows={2}
                        value={ev.notes ?? ""}
                        onChange={(e) =>
                          setEvidenceField(ev.id, { notes: e.target.value })
                        }
                        placeholder="Notes (why it matters, what it proves)"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: Chat */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-950">Ask THOXIE</h2>
            <Link
              href="/"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
            >
              Back home
            </Link>
          </div>

          <div className="mt-4 h-[520px] overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            {chatLog.length === 0 ? (
              <div className="text-sm text-zinc-600">
                Ask a question. I’ll answer and then ask follow-ups.
              </div>
            ) : (
              <div className="space-y-3">
                {chatLog.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                      m.who === "user"
                        ? "ml-auto bg-zinc-950 text-white"
                        : "mr-auto bg-white text-zinc-950 border border-zinc-200"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onChatSend();
              }}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm"
              placeholder="Ask a question…"
            />
            <button
              type="button"
              onClick={onChatSend}
              disabled={chatBusy}
              className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {chatBusy ? "…" : "Send"}
            </button>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Not a law firm · No legal advice · Educational decision-support only
          </div>
        </section>
      </div>
    </main>
  );
}

