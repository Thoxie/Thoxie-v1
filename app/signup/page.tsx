"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CA_COUNTIES, countyToCourtFinderUrl } from "@/lib/caCounties";
import {
  CaseIntake,
  FamilyLawRole,
  IntakePack,
  loadCase,
  newId,
  saveCase,
} from "@/lib/caseStore";

const PACKS: {
  id: IntakePack;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "first_filing",
    title: "Start a Divorce (First Filing)",
    subtitle: "Get organized before you file anything.",
  },
  {
    id: "hearing_prep",
    title: "Prepare for a Hearing",
    subtitle: "Talking points, evidence checklist, and timeline.",
  },
  {
    id: "declaration_draft",
    title: "Draft a Declaration",
    subtitle: "Facts outline + exhibit placeholders.",
  },
];

export default function SignupPage() {
  const existing = useMemo(() => loadCase(), []);

  const [pack, setPack] = useState<IntakePack>(
    existing?.pack ?? "first_filing"
  );
  const [county, setCounty] = useState(existing?.county ?? "");
  const [role, setRole] = useState<FamilyLawRole>(
    existing?.role ?? "Respondent"
  );
  const [hasHearing, setHasHearing] = useState<boolean>(
    existing?.hasHearing ?? false
  );
  const [hearingDate, setHearingDate] = useState(
    existing?.hearingDateIso ?? ""
  );
  const [helpSummary, setHelpSummary] = useState(
    existing?.helpSummary ?? ""
  );

  // AI chat
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<
    { who: "ai" | "user"; text: string }[]
  >([
    {
      who: "ai",
      text:
        "Tell me what you’re preparing (first filing, hearing, or declaration) and your California county.",
    },
  ]);
  const [chatBusy, setChatBusy] = useState(false);

  const canSave =
    county.trim().length > 0 &&
    (pack !== "hearing_prep" || !hasHearing || hearingDate);

  const courtLink = useMemo(
    () => (county ? countyToCourtFinderUrl(county) : ""),
    [county]
  );

  async function saveAndContinue() {
    const payload: CaseIntake = {
      id: existing?.id ?? newId("case"),
      createdAtIso: existing?.createdAtIso ?? new Date().toISOString(),
      pack,
      county,
      role,
      hasHearing,
      hearingDateIso: hearingDate || undefined,
      helpSummary: helpSummary || undefined,
      evidence: existing?.evidence ?? [],
    };

    saveCase(payload);
    alert("Case saved. Next step: Evidence uploads.");
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
      setChatLog((l) => [
        ...l,
        { who: "ai", text: "Error connecting to AI. Try again." },
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
            Family Law · California · Not a law firm
          </p>

          {/* Pack selection */}
          <div className="mt-8 space-y-3">
            {PACKS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPack(p.id)}
                className={`w-full rounded-2xl border p-4 text-left ${
                  pack === p.id
                    ? "bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
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
                    <a
                      href={courtLink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Find your court
                    </a>
                  </div>
                )}
              </label>

              <label>
                <div className="text-xs font-semibold">Your role</div>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as FamilyLawRole)
                  }
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
              <div className="text-sm font-semibold">
                Do you have a hearing scheduled?
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => setHasHearing(true)}
                  className={`rounded-xl px-4 py-2 ${
                    hasHearing
                      ? "bg-zinc-950 text-white"
                      : "border bg-white"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setHasHearing(false)}
                  className={`rounded-xl px-4 py-2 ${
                    !hasHearing
                      ? "bg-zinc-950 text-white"
                      : "border bg-white"
                  }`}
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

            <label className="mt-6 block">
              <div className="text-xs font-semibold">
                What do you need help with right now?
              </div>
              <textarea
                rows={4}
                value={helpSummary}
                onChange={(e) => setHelpSummary(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-2"
              />
            </label>

            <div className="mt-6 flex items-center gap-4">
              <button
                disabled={!canSave}
                onClick={saveAndContinue}
                className={`rounded-xl px-6 py-3 font-semibold ${
                  canSave
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-200 text-zinc-500"
                }`}
              >
                Save & Continue
              </button>

              <Link href="/" className="text-sm underline">
                Back to home
              </Link>
            </div>
          </div>
        </section>

        {/* RIGHT — AI */}
        <aside className="lg:col-span-5">
          <div className="sticky top-28 rounded-2xl border border-zinc-200 p-6">
            <div className="font-semibold">THOXIE AI</div>

            <div className="mt-4 h-[420px] overflow-auto rounded-xl border p-3">
              {chatLog.map((m, i) => (
                <div
                  key={i}
                  className={`mb-2 rounded-xl px-3 py-2 text-sm ${
                    m.who === "ai"
                      ? "bg-zinc-50"
                      : "bg-zinc-950 text-white"
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
          </div>
        </aside>
      </div>
    </main>
  );
}


