// PATH: app/case/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCaseStore } from "@/lib/caseStore";
import counties from "@/lib/caCounties";

type StepId =
  | "caseType"
  | "state"
  | "county"
  | "parties"
  | "topic"
  | "facts"
  | "documents"
  | "review";

const steps: { id: StepId; label: string }[] = [
  { id: "caseType", label: "Matter" },
  { id: "state", label: "State" },
  { id: "county", label: "County" },
  { id: "parties", label: "Parties" },
  { id: "topic", label: "Topic" },
  { id: "facts", label: "Facts" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
];

export default function CasePage() {
  const store = useCaseStore();

  const [step, setStep] = useState<StepId>("caseType");

  const stepIndex = useMemo(() => steps.findIndex((s) => s.id === step), [step]);

  function goNext() {
    const next = steps[stepIndex + 1]?.id;
    if (next) setStep(next);
  }

  function goBack() {
    const prev = steps[stepIndex - 1]?.id;
    if (prev) setStep(prev);
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Family Law Intake
            </h1>
            <p className="mt-2 text-sm text-neutral-700">
              Structured intake for family-law matters. Neutral, factual, and
              designed to generate organized outputs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="rounded-xl border border-neutral-200 p-4">
              <div className="text-sm font-medium text-neutral-900">
                Steps
              </div>
              <ol className="mt-3 space-y-2">
                {steps.map((s, idx) => {
                  const active = s.id === step;
                  const done = idx < stepIndex;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setStep(s.id)}
                        className={[
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                          active
                            ? "bg-neutral-900 text-white"
                            : "hover:bg-neutral-50",
                        ].join(" ")}
                      >
                        <span>
                          {idx + 1}. {s.label}
                        </span>
                        <span className="text-xs">
                          {done ? "Done" : active ? "Current" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>

          <section className="lg:col-span-8">
            <div className="rounded-xl border border-neutral-200 p-6">
              {step === "caseType" && (
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Matter type
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    Select the family-law workflow you are working on.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      { id: "divorce", label: "Divorce / Dissolution" },
                      { id: "custody", label: "Custody / Parenting" },
                      { id: "support", label: "Support (child/spousal)" },
                      { id: "property", label: "Property / Valuation" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => store.setCaseType(opt.id)}
                        className={[
                          "rounded-lg border px-4 py-3 text-left text-sm",
                          store.caseType === opt.id
                            ? "border-neutral-900"
                            : "border-neutral-200 hover:border-neutral-400",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === "state" && (
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    State
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    Choose the jurisdiction for your family-law matter.
                  </p>

                  <div className="mt-4">
                    <select
                      className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
                      value={store.state}
                      onChange={(e) => store.setState(e.target.value)}
                    >
                      <option value="">Select a state…</option>
                      <option value="CA">California</option>
                    </select>
                  </div>
                </div>
              )}

              {step === "county" && (
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    County
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    Choose the county (California only in this restore target).
                  </p>

                  <div className="mt-4">
                    <select
                      className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
                      value={store.county}
                      onChange={(e) => store.setCounty(e.target.value)}
                      disabled={store.state !== "CA"}
                    >
                      <option value="">
                        {store.state === "CA"
                          ? "Select a county…"
                          : "Select state first…"}
                      </option>
                      {counties.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {step === "parties" && (
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Parties
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    Identify the main parties. Use full legal names if possible.
                  </p>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-sm text-neutral-800">
                        Your name
                      </label>
                      <input
                        className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm"
                        value={store.userName}
                        onChange={(e) => store.setUserName(e.target.value)}
                        placeholder="e.g., John A. Smith"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-800">
                        Other party name
                      </label>
                      <input
                        className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm"
                        value={store.otherPartyName}
                        onChange={(e) => store.setOtherPartyName(e.target.value)}
                        placeholder="e.g., Jane B. Smith"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === "topic" && (
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Issue / Topic
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    Provide a short description of what you need help with.
                  </p>

                  <textarea
                    className="mt-4 min-h-[140px] w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={store.topic}
                    onChange={(e) => store.setTopic(e.target.value)}
                    placeholder="e.g., Responding to an RFO re sale of property, valuation dispute, and requested interim orders…"
                  />
                </div>
              )}

              {step === "facts" && (
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Facts
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    List key facts in plain language. Keep it chronological where possible.
                  </p>

                  <textarea
                    className="mt-4 min-h-[220px] w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={store.facts}
                    onChange={(e) => store.setFacts(e.target.value)}
                    placeholder="Key facts, dates, communications, and current posture…"
                  />
                </div>
              )}

              {step === "documents" && (
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Documents
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    This restore target keeps document intake as a placeholder.
                  </p>

                  <div className="mt-4 rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-700">
                    Upload UI will be re-added later.
                  </div>
                </div>
              )}

              {step === "review" && (
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Review
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    Review the captured intake fields.
                  </p>

                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <div className="font-medium text-neutral-900">Matter</div>
                      <div className="text-neutral-700">{store.caseType || "(not set)"}</div>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">State</div>
                      <div className="text-neutral-700">{store.state || "(not set)"}</div>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">County</div>
                      <div className="text-neutral-700">{store.county || "(not set)"}</div>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">Your name</div>
                      <div className="text-neutral-700">{store.userName || "(not set)"}</div>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">Other party</div>
                      <div className="text-neutral-700">{store.otherPartyName || "(not set)"}</div>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">Topic</div>
                      <div className="text-neutral-700 whitespace-pre-wrap">{store.topic || "(not set)"}</div>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">Facts</div>
                      <div className="text-neutral-700 whitespace-pre-wrap">{store.facts || "(not set)"}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={stepIndex === steps.length - 1}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


