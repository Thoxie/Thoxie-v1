// PATH: app/case/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Entry =
  | "thinking"
  | "preparing"
  | "open_case"
  | "lost_attorney"
  | "have_attorney";

type Step = "entry" | "rep" | "court" | "parties" | "issues" | "urgency" | "done";

const CASE_TYPES = [
  "Divorce (Dissolution)",
  "Legal Separation",
  "Parentage / Custody",
  "Support (Child / Spousal)",
  "Post-Judgment Enforcement",
  "Other",
] as const;

const HEARING_TYPES = [
  "Case Management / Status",
  "RFO Hearing",
  "Trial Setting / Trial",
  "Mediation",
  "Other",
] as const;

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-zinc-700">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-4 py-3 text-left text-sm",
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-300 bg-white hover:bg-zinc-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Toggle({
  label,
  v,
  onChange,
}: {
  label: string;
  v: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm">
      <span className="text-zinc-900">{label}</span>
      <input
        type="checkbox"
        checked={v}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}

export default function CasePage() {
  // Entry
  const [entry, setEntry] = useState<Entry | "">("");
  const [step, setStep] = useState<Step>("entry");

  // Step 1: Status & Representation
  const [rep, setRep] = useState<"self" | "attorney" | "not_sure">("self");
  const [attorneyName, setAttorneyName] = useState("");
  const [caseType, setCaseType] = useState<(typeof CASE_TYPES)[number] | "">("");
  const [hearingType, setHearingType] = useState<(typeof HEARING_TYPES)[number] | "">("");
  const [hearingDate, setHearingDate] = useState("");

  // Step 2: Court
  const [county, setCounty] = useState("San Mateo");
  const [courtroom, setCourtroom] = useState("");
  const [judge, setJudge] = useState("");

  // Step 3: Parties
  const [otherPartyName, setOtherPartyName] = useState("");
  const [childrenInvolved, setChildrenInvolved] = useState<"yes" | "no" | "not_sure">("not_sure");
  const [childrenCount, setChildrenCount] = useState("");

  // Step 4: Issues & Stakes (DVRO removed)
  const [issues, setIssues] = useState<Record<string, boolean>>({
    custody: false,
    child_support: false,
    spousal_support: false,
    property: false,
    debt: false,
    fees: false,
    enforcement: false,
    other: false,
  });
  const [otherIssueText, setOtherIssueText] = useState("");
  const [winDefinition, setWinDefinition] = useState("");

  // Step 5: Urgency
  const [deadline, setDeadline] = useState("");
  const [risk, setRisk] = useState("");
  const [notes, setNotes] = useState("");

  const chosenIssues = useMemo(() => {
    const map: Record<string, string> = {
      custody: "Custody / visitation",
      child_support: "Child support",
      spousal_support: "Spousal support",
      property: "Property division",
      debt: "Debt",
      fees: "Attorney fees",
      enforcement: "Enforcement / contempt",
      other: "Other",
    };
    const chosen = Object.entries(issues)
      .filter(([, v]) => v)
      .map(([k]) => map[k] || k);
    if (issues.other && otherIssueText.trim())
      chosen[chosen.length - 1] = `Other: ${otherIssueText.trim()}`;
    return chosen;
  }, [issues, otherIssueText]);

  function go(to: Step) {
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEntry("");
    setStep("entry");
    setRep("self");
    setAttorneyName("");
    setCaseType("");
    setHearingType("");
    setHearingDate("");
    setCounty("San Mateo");
    setCourtroom("");
    setJudge("");
    setOtherPartyName("");
    setChildrenInvolved("not_sure");
    setChildrenCount("");
    setIssues({
      custody: false,
      child_support: false,
      spousal_support: false,
      property: false,
      debt: false,
      fees: false,
      enforcement: false,
      other: false,
    });
    setOtherIssueText("");
    setWinDefinition("");
    setDeadline("");
    setRisk("");
    setNotes("");
  }

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Case Builder</h1>
              <p className="mt-2 text-sm text-zinc-700">
                Family law only. Build a clean snapshot so THOXIE can generate a plan.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Home
              </Link>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-600">
            <span className={step === "entry" ? "font-semibold text-zinc-950" : ""}>Entry</span>
            <span>→</span>
            <span className={step === "rep" ? "font-semibold text-zinc-950" : ""}>Status</span>
            <span>→</span>
            <span className={step === "court" ? "font-semibold text-zinc-950" : ""}>Court</span>
            <span>→</span>
            <span className={step === "parties" ? "font-semibold text-zinc-950" : ""}>Parties</span>
            <span>→</span>
            <span className={step === "issues" ? "font-semibold text-zinc-950" : ""}>Issues</span>
            <span>→</span>
            <span className={step === "urgency" ? "font-semibold text-zinc-950" : ""}>Urgency</span>
            <span>→</span>
            <span className={step === "done" ? "font-semibold text-zinc-950" : ""}>Done</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {step === "entry" ? (
          <Card
            title="How are you coming into this?"
            subtitle="Pick what best describes your current situation."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Pill
                active={entry === "thinking"}
                label="I’m thinking about filing"
                onClick={() => setEntry("thinking")}
              />
              <Pill
                active={entry === "preparing"}
                label="I’m preparing to file / already filed"
                onClick={() => setEntry("preparing")}
              />
              <Pill
                active={entry === "open_case"}
                label="I have an open case"
                onClick={() => setEntry("open_case")}
              />
              <Pill
                active={entry === "lost_attorney"}
                label="I lost my attorney / going self-rep"
                onClick={() => setEntry("lost_attorney")}
              />
              <Pill
                active={entry === "have_attorney"}
                label="I have an attorney but I want a plan"
                onClick={() => setEntry("have_attorney")}
              />
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => go("rep")}
                disabled={!entry}
                className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </Card>
        ) : null}

        {step === "rep" ? (
          <Card title="Status" subtitle="Representation and the type of case you’re in.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <div className="font-semibold">Representation</div>
                <select
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={rep}
                  onChange={(e) => setRep(e.target.value as any)}
                >
                  <option value="self">Self-represented</option>
                  <option value="attorney">I have an attorney</option>
                  <option value="not_sure">Not sure</option>
                </select>
              </label>

              <label className="text-sm">
                <div className="font-semibold">Attorney name (optional)</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={attorneyName}
                  onChange={(e) => setAttorneyName(e.target.value)}
                  placeholder="Attorney name"
                />
              </label>

              <label className="text-sm">
                <div className="font-semibold">Case type</div>
                <select
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value as any)}
                >
                  <option value="">Select…</option>
                  {CASE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <div className="font-semibold">Hearing type (optional)</div>
                <select
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={hearingType}
                  onChange={(e) => setHearingType(e.target.value as any)}
                >
                  <option value="">Select…</option>
                  {HEARING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <div className="font-semibold">Hearing date (optional)</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => go("entry")}
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => go("court")}
                className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </Card>
        ) : null}

        {step === "court" ? (
          <Card title="Court" subtitle="Basic court details (optional).">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <div className="font-semibold">County</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="e.g., San Mateo"
                />
              </label>

              <label className="text-sm">
                <div className="font-semibold">Courtroom (optional)</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={courtroom}
                  onChange={(e) => setCourtroom(e.target.value)}
                  placeholder="e.g., Dept 12"
                />
              </label>

              <label className="text-sm">
                <div className="font-semibold">Judge (optional)</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={judge}
                  onChange={(e) => setJudge(e.target.value)}
                  placeholder="Judge name"
                />
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => go("rep")}
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => go("parties")}
                className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </Card>
        ) : null}

        {step === "parties" ? (
          <Card title="Parties" subtitle="Who is involved.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <div className="font-semibold">Other party name</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={otherPartyName}
                  onChange={(e) => setOtherPartyName(e.target.value)}
                  placeholder="Other party"
                />
              </label>

              <label className="text-sm">
                <div className="font-semibold">Children involved?</div>
                <select
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={childrenInvolved}
                  onChange={(e) => setChildrenInvolved(e.target.value as any)}
                >
                  <option value="not_sure">Not sure</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>

              <label className="text-sm">
                <div className="font-semibold">Number of children (optional)</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(e.target.value)}
                  placeholder="e.g., 2"
                />
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => go("court")}
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => go("issues")}
                className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </Card>
        ) : null}

        {step === "issues" ? (
          <Card
            title="Issues"
            subtitle="Pick what matters. THOXIE will generate checklists and drafts around these."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Toggle label="Custody / visitation" v={issues.custody} onChange={(v) => setIssues({ ...issues, custody: v })} />
              <Toggle label="Child support" v={issues.child_support} onChange={(v) => setIssues({ ...issues, child_support: v })} />
              <Toggle label="Spousal support" v={issues.spousal_support} onChange={(v) => setIssues({ ...issues, spousal_support: v })} />
              <Toggle label="Property division" v={issues.property} onChange={(v) => setIssues({ ...issues, property: v })} />
              <Toggle label="Debt" v={issues.debt} onChange={(v) => setIssues({ ...issues, debt: v })} />
              <Toggle label="Attorney fees" v={issues.fees} onChange={(v) => setIssues({ ...issues, fees: v })} />
              <Toggle label="Enforcement / contempt" v={issues.enforcement} onChange={(v) => setIssues({ ...issues, enforcement: v })} />
              <Toggle label="Other" v={issues.other} onChange={(v) => setIssues({ ...issues, other: v })} />
            </div>

            {issues.other ? (
              <label className="mt-4 block text-sm">
                <div className="font-semibold">Other (describe)</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={otherIssueText}
                  onChange={(e) => setOtherIssueText(e.target.value)}
                  placeholder="Describe the issue"
                />
              </label>
            ) : null}

            <label className="mt-6 block text-sm">
              <div className="font-semibold">Define “win” (optional)</div>
              <textarea
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                rows={4}
                value={winDefinition}
                onChange={(e) => setWinDefinition(e.target.value)}
                placeholder="What outcome would you accept? What’s non-negotiable?"
              />
            </label>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => go("parties")}
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => go("urgency")}
                className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </Card>
        ) : null}

        {step === "urgency" ? (
          <Card title="Urgency" subtitle="Deadlines and risk so THOXIE prioritizes correctly.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <div className="font-semibold">Deadline (optional)</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </label>

              <label className="text-sm">
                <div className="font-semibold">Biggest risk (optional)</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  value={risk}
                  onChange={(e) => setRisk(e.target.value)}
                  placeholder="What are you worried about?"
                />
              </label>
            </div>

            <label className="mt-6 block text-sm">
              <div className="font-semibold">Notes (optional)</div>
              <textarea
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Facts, timeline, what happened…"
              />
            </label>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => go("issues")}
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => go("done")}
                className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white"
              >
                Finish
              </button>
            </div>
          </Card>
        ) : null}

        {step === "done" ? (
          <Card
            title="Done"
            subtitle="Copy/paste this snapshot into THOXIE chat (or save it)."
          >
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
              <div><b>Entry:</b> {entry || "—"}</div>
              <div><b>Representation:</b> {rep}</div>
              {attorneyName.trim() ? <div><b>Attorney:</b> {attorneyName}</div> : null}
              <div><b>Case type:</b> {caseType || "—"}</div>
              {hearingType ? <div><b>Hearing type:</b> {hearingType}</div> : null}
              {hearingDate ? <div><b>Hearing date:</b> {hearingDate}</div> : null}
              <div className="mt-3"><b>County:</b> {county}</div>
              {courtroom ? <div><b>Courtroom:</b> {courtroom}</div> : null}
              {judge ? <div><b>Judge:</b> {judge}</div> : null}
              <div className="mt-3"><b>Other party:</b> {otherPartyName || "—"}</div>
              <div><b>Children:</b> {childrenInvolved}{childrenCount ? ` (${childrenCount})` : ""}</div>
              <div className="mt-3"><b>Issues:</b> {chosenIssues.length ? chosenIssues.join(", ") : "—"}</div>
              {winDefinition.trim() ? <div className="mt-2"><b>Win:</b> {winDefinition}</div> : null}
              {deadline ? <div className="mt-2"><b>Deadline:</b> {deadline}</div> : null}
              {risk.trim() ? <div><b>Risk:</b> {risk}</div> : null}
              {notes.trim() ? <div className="mt-2"><b>Notes:</b> {notes}</div> : null}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => go("urgency")}
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Back
              </button>
              <Link
                href="/signup"
                className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Continue to Signup
              </Link>
            </div>

            <div className="mt-6 text-xs text-zinc-500">
              THOXIE is not a law firm. No legal advice.
            </div>
          </Card>
        ) : null}
      </section>
    </main>
  );
}



