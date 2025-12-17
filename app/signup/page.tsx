"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CA_COUNTIES, countyToCourtFinderUrl } from "@/lib/caCounties";
import {
  CaseIntake,
  EvidenceItem,
  EvidenceKind,
  EvidenceSide,
  FamilyLawRole,
  IntakePack,
  loadCase,
  newId,
  saveCase,
} from "@/lib/caseStore";

const PACKS: { id: IntakePack; title: string; subtitle: string }[] = [
  { id: "first_filing", title: "Start a Divorce (First Filing)", subtitle: "Get organized before you file anything." },
  { id: "hearing_prep", title: "Prepare for a Hearing", subtitle: "Talking points, evidence checklist, and timeline." },
  { id: "declaration_draft", title: "Draft a Declaration", subtitle: "Facts outline + exhibit placeholders." },
];

const ISSUE_TAGS = [
  { id: "custody", label: "Custody / Timeshare" },
  { id: "support", label: "Support (Child/Spousal)" },
  { id: "property", label: "Property / Real estate" },
  { id: "debt", label: "Debt" },
  { id: "disclosure", label: "Financial disclosure" },
  { id: "enforcement", label: "Enforcement / contempt" },
  { id: "dvro", label: "DVRO related" },
] as const;

// ---------- IndexedDB (files) ----------
const DB_NAME = "thoxie_evidence_db";
const DB_VERSION = 1;
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
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

export default function SignupPage() {
  const existing = useMemo(() => loadCase(), []);

  const [pack, setPack] = useState<IntakePack>(existing?.pack ?? "first_filing");
  const [county, setCounty] = useState(existing?.county ?? "");
  const [role, setRole] = useState<FamilyLawRole>(existing?.role ?? "Respondent");
  const [hasHearing, setHasHearing] = useState<boolean>(existing?.hasHearing ?? false);
  const [hearingDate, setHearingDate] = useState(existing?.hearingDateIso ?? "");

  // This is now explicitly optional and NOT the main interaction.
  const [helpSummary, setHelpSummary] = useState(existing?.helpSummary ?? "");

  const [evidence, setEvidence] = useState<EvidenceItem[]>(existing?.evidence ?? []);

  // Evidence form controls
  const [evSide, setEvSide] = useState<EvidenceSide>("mine");
  const [evKind, setEvKind] = useState<EvidenceKind>("file");
  const [evNotes, setEvNotes] = useState("");
  const [evTags, setEvTags] = useState<string[]>([]);
  const [evTextTitle, setEvTextTitle] = useState("");
  const [evTextBody, setEvTextBody] = useState("");
  const [evFiles, setEvFiles] = useState<FileList | null>(null);
  const [evBusy, setEvBusy] = useState(false);

  // AI chat
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{ who: "ai" | "user"; text: string }[]>([
    { who: "ai", text: "Tell me what you’re preparing (first filing, hearing, or declaration) and your California county." },
  ]);
  const [chatBusy, setChatBusy] = useState(false);

  const courtLink = useMemo(() => (county ? countyToCourtFinderUrl(county) : ""), [county]);

  const canSave =
    county.trim().length > 0 &&
    (pack !== "hearing_prep" || !hasHearing || hearingDate);

  function persist(updatedEvidence: EvidenceItem[] = evidence) {
    const payload: CaseIntake = {
      id: existing?.id ?? newId("case"),
      createdAtIso: existing?.createdAtIso ?? new Date().toISOString(),
      pack,
      county,
      role,
      hasHearing,
      hearingDateIso: hearingDate || undefined,
      helpSummary: helpSummary.trim() || undefined,
      evidence: updatedEvidence,
    };
    saveCase(payload);
  }

  async function saveAndContinue() {
    persist(evidence);
    alert("Case saved. Next step: we’ll generate packs from your saved case + evidence.");
  }

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
          context: { pack, county, role, hasHearing, hearingDate },
        }),
      });

      const json = await res.json();
      setChatLog((l) => [...l, { who: "ai", text: json.reply }]);
    } catch {
      setChatLog((l) => [...l, { who: "ai", text: "Error connecting to AI. Try again." }]);
    } finally {
      setChatBusy(false);
    }
  }

  function toggleTag(tag: string) {
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
          createdAtIso: new Date().toISOString(),
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
            savedAtIso: new Date().toISOString(),
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
            createdAtIso: new Date().toISOString(),
          });
        }
        setEvFiles(null);
        // reset the input visually by clearing state; browser keeps file picker UI, that’s okay
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

    if (item.kind === "file" && item.dbKey) {
      await idbDel(item.dbKey);
    }

    const updated = evidence.filter((e) => e.id !== item.id);
    setEvidence(updated);
    persist(updated);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT */}
        <section className="lg:col-span-7">
          <h1 className="text-3xl font-extrabold">Start Free</h1>
          <p className="mt-2 text-sm text-zinc-700">
            Family Law · California · Not a law firm · No legal advice
          </p>

          {/* Pack selection */}
          <div className="mt-8 space-y-3">
            {PACKS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPack(p.id)}
                className={`w-full rounded-2xl border p-4 text-left ${
                  pack === p.id ? "bg-zinc-950 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm opacity-80">{p.subtitle}</div>
              </button>
            ))}
          </div>

          {/* Case basics */}
          <div className="mt-6 rounded-2xl border border-zinc-200 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <div className="text-xs font-semibold">County</div>
                <select
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2"
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
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                >
                  <option value="Petitioner">Petitioner</option>
                  <option value="Respondent">Respondent</option>
                  <option value="Other/Not sure">Other / Not sure</option>
                </select>
              </label>
            </div>

            {/* Hearing */}
            <div className="mt-6">
              <div className="text-sm font-semibold">Do you have a hearing scheduled?</div>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => setHasHearing(true)}
                  className={`rounded-xl px-4 py-2 ${hasHearing ? "bg-zinc-950 text-white" : "border bg-white"}`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setHasHearing(false)}
                  className={`rounded-xl px-4 py-2 ${!hasHearing ? "bg-zinc-950 text-white" : "border bg-white"}`}
                >
                  No
                </button>
              </div>

              {hasHearing && (
                <input
                  type="date"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="mt-3 rounded-xl border px-3 py-2"
                />
              )}
            </div>

            {/* Optional objective */}
            <label className="mt-6 block">
              <div className="text-xs font-semibold">Optional: One-sentence objective (saved to your case)</div>
              <div className="mt-1 text-xs text-zinc-600">
                Use the AI chat panel for the real conversation. This field is just a saved “case objective.”
              </div>
              <textarea
                rows={3}
                value={helpSummary}
                onChange={(e) => setHelpSummary(e.target.value)}
                placeholder="Example: I want a clean hearing prep pack for custody and I need my facts/evidence organized."
                className="mt-2 w-full rounded-xl border px-3 py-2"
              />
            </label>

            <div className="mt-6 flex items-center gap-4">
              <button
                disabled={!canSave}
                onClick={saveAndContinue}
                className={`rounded-xl px-6 py-3 font-semibold ${
                  canSave ? "bg-zinc-950 text-white" : "bg-zinc-200 text-zinc-500"
                }`}
              >
                Save & Continue
              </button>

              <Link href="/" className="text-sm underline">
                Back to home
              </Link>
            </div>
          </div>

          {/* Evidence Vault */}
          <div className="mt-6 rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Evidence Vault</div>
                <div className="mt-1 text-xs text-zinc-600">
                  Upload files or paste text. Label as “Yours” vs “Other party.” Stored locally on this device (Phase 1).
                </div>
              </div>
              <div className="text-xs text-zinc-600">Items: {evidence.length}</div>
            </div>

            {/* Evidence add form */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <div className="text-xs font-semibold">Source</div>
                <select
                  value={evSide}
                  onChange={(e) => setEvSide(e.target.value as EvidenceSide)}
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                >
                  <option value="mine">Your documents</option>
                  <option value="other_party">Other party documents</option>
                </select>
              </label>

              <label>
                <div className="text-xs font-semibold">Type</div>
                <select
                  value={evKind}
                  onChange={(e) => setEvKind(e.target.value as EvidenceKind)}
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                >
                  <option value="file">Upload file(s)</option>
                  <option value="text">Paste text (email, notes, messages)</option>
                </select>
              </label>
            </div>

            {evKind === "file" ? (
              <div className="mt-4">
                <div className="text-xs font-semibold">Upload files</div>
                <div className="mt-1 text-xs text-zinc-600">
                  Supports PDF, Word, images, TXT. (Stored locally via IndexedDB)
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
                    placeholder="Example: Email thread re pickup refusal"
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-semibold">Paste text</div>
                  <textarea
                    value={evTextBody}
                    onChange={(e) => setEvTextBody(e.target.value)}
                    placeholder="Paste email text, message thread, notes…"
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
                    onClick={() => toggleTag(t.id)}
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
                {evBusy ? "Saving…" : "Add to Evidence Vault"}
              </button>
              <div className="text-xs text-zinc-600">Saved to this device only (Phase 1).</div>
            </div>

            {/* Evidence list */}
            <div className="mt-6 rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-semibold">Saved evidence</div>

              {evidence.length === 0 ? (
                <div className="mt-2 text-sm text-zinc-600">
                  No evidence saved yet. Upload files or paste text above.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {evidence.slice().reverse().map((item) => (
                    <div key={item.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {item.kind === "file"
                              ? item.fileName
                              : item.textTitle || "Pasted text"}
                          </div>
                          <div className="mt-1 text-xs text-zinc-600">
                            {item.side === "mine" ? "Your documents" : "Other party documents"} ·{" "}
                            {item.kind === "file"
                              ? `${item.fileType || "file"}${item.fileSize ? ` · ${Math.round(item.fileSize / 1024)} KB` : ""}`
                              : "text"}
                          </div>
                          {item.notes && <div className="mt-1 text-xs text-zinc-700">Notes: {item.notes}</div>}
                          {item.issueTags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.issueTags.map((t) => (
                                <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}
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
        </section>

        {/* RIGHT — AI */}
        <aside className="lg:col-span-5">
          <div className="sticky top-28 rounded-2xl border border-zinc-200 p-6">
            <div className="font-semibold">THOXIE AI</div>
            <div className="mt-1 text-xs text-zinc-600">Main interaction lives here.</div>

            <div className="mt-4 h-[420px] overflow-auto rounded-xl border p-3">
              {chatLog.map((m, i) => (
                <div
                  key={i}
                  className={`mb-2 rounded-xl px-3 py-2 text-sm ${
                    m.who === "ai" ? "bg-zinc-50" : "bg-zinc-950 text-white"
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Ask THOXIE…"
                className="flex-1 rounded-xl border px-3 py-2"
              />
              <button
                onClick={sendChat}
                disabled={chatBusy}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-white"
              >
                Send
              </button>
            </div>

            <div className="mt-3 text-xs text-zinc-600">
              Phase 1 chat is a stub response. Next we connect real AI that can reference your saved case + evidence.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}




