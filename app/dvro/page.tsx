// PATH: app/dvro/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  loadDvro,
  newId,
  saveDvro,
  type DvroIntake,
  type DvroRequest,
  type DvroRole,
  type DvroStage,
} from "@/lib/dvroStore";

type Step = "role_stage" | "basics" | "incident" | "requests" | "done";

function formatDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const STAGES: { id: DvroStage; label: string; desc: string }[] = [
  { id: "considering", label: "Considering filing", desc: "Not filed yet. Need strategy + prep." },
  { id: "filed_waiting", label: "Filed — waiting", desc: "Filed papers; pending TRO decision or service." },
  { id: "tro_granted", label: "TRO granted", desc: "Temporary order exists; need next steps + hearing plan." },
  { id: "tro_denied", label: "TRO denied", desc: "Temporary order denied; need options + hearing posture." },
  { id: "served", label: "Served", desc: "I was served (or service completed)." },
  { id: "response_filed", label: "Response filed", desc: "Response submitted; hearing coming." },
  { id: "hearing_scheduled", label: "Hearing scheduled", desc: "Have a hearing date; need judge-ready prep." },
  { id: "after_hearing", label: "After hearing", desc: "Order made; need compliance/modification plan." },
  { id: "not_sure", label: "Not sure", desc: "We’ll triage quickly." },
];

const REQUESTS: { id: DvroRequest; label: string }[] = [
  { id: "personal_conduct", label: "Personal conduct orders (no abuse/harassment)" },
  { id: "stay_away", label: "Stay-away distance" },
  { id: "no_contact", label: "No contact (calls/texts/email)" },
  { id: "move_out", label: "Move-out order" },
  { id: "firearms", label: "Firearms restrictions" },
  { id: "custody_visitation", label: "Child custody/visitation (DVRO crossover)" },
  { id: "child_support", label: "Child support (if applicable)" },
  { id: "property_control", label: "Property/vehicle control" },
  { id: "other", label: "Other" },
];

const ROLE_OPTIONS: { id: DvroRole; label: string }[] = [
  { id: "Petitioner", label: "Petitioner (I’m seeking the order / filing)" },
  { id: "Respondent", label: "Respondent (I was served / accused)" },
  { id: "Not sure", label: "Not sure" },
];

export default function DvroPage() {
  const today = useMemo(() => formatDateInput(new Date()), []);
  const [step, setStep] = useState<Step>("role_stage");

  const [model, setModel] = useState<DvroIntake>(() => ({
    id: newId(),
    createdAtIso: new Date().toISOString(),
    county: "San Mateo",
    role: "Not sure",
    stage: "not_sure",
    hasChildrenInCommon: "",
    hearingDateIso: "",
    incidentSummary: "",
    incidentDateIso: "",
    requests: [],
    requestOtherText: "",
  }));

  useEffect(() => {
    const saved = loadDvro();
    if (saved) {
      setModel({
        ...saved,
        id: saved.id || newId(),
        createdAtIso: saved.createdAtIso || new Date().toISOString(),
        requests: Array.isArray(saved.requests) ? saved.requests : [],
      });
    }
  }, []);

  useEffect(() => {
    saveDvro(model);
  }, [model]);

  const steps: Step[] = ["role_stage", "basics", "incident", "requests", "done"];
  const progress = useMemo(() => {
    const i = steps.indexOf(step);
    const denom = steps.length - 1;
    return denom <= 0 ? 0 : Math.round((i / denom) * 100);
  }, [step]);

  function go(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function next() {
    const i = steps.indexOf(step);
    if (i < steps.length - 1) go(steps[i + 1]);
  }
  function back() {
    const i = steps.indexOf(step);
    if (i > 0) go(steps[i - 1]);
  }

  function toggleRequest(id: DvroRequest) {
    setModel((m) => {
      const has = m.requests.includes(id);
      return { ...m, requests: has ? m.requests.filter((x) => x !== id) : [...m.requests, id] };
    });
  }

  const canNextRoleStage = model.role !== "Not sure" || model.stage !== "not_sure";
  const canNextBasics = model.county.trim().length > 0 && model.hasChildrenInCommon !== "";
  const canNextIncident = (model.incidentSummary || "").trim().length >= 20;
  const canNextRequests = model.requests.length > 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">DVRO Intake</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Fast intake first. Next we’ll build a clean timeline, exhibits plan, and hearing prep.
            (Not a law firm. No legal advice.)
          </p>
        </div>

        <div className="text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="h-2 w-40 rounded-full bg-zinc-200">
              <div className="h-2 rounded-full bg-zinc-950" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
          ← Home
        </Link>
        <Link href="/signup" className="text-sm font-semibold text-zinc-950 hover:underline">
          Go to Ask THOXIE →
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {step === "role_stage" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">1) Role + DVRO stage</h2>
              <p className="mt-1 text-sm text-zinc-600">
                This sets posture (service, response, hearing prep) and keeps THOXIE in the right guardrails.
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-zinc-900">Your role</div>
              <div className="mt-2 grid gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setModel((m) => ({ ...m, role: r.id }))}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      model.role === r.id
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="text-sm font-semibold">{r.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-zinc-900">Current stage</div>
              <div className="mt-2 grid gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setModel((m) => ({ ...m, stage: s.id }))}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      model.stage === s.id
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className={`text-xs ${model.stage === s.id ? "text-white/80" : "text-zinc-600"}`}>
                      {s.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="text-xs text-zinc-600">
                Tip: If you were served papers, select “Served.”
              </div>
              <button
                type="button"
                onClick={next}
                disabled={!canNextRoleStage}
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === "basics" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">2) Basics</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-900">County</label>
                <input
                  value={model.county}
                  onChange={(e) => setModel((m) => ({ ...m, county: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  placeholder="e.g., San Mateo"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-900">Children in common?</label>
                <select
                  value={model.hasChildrenInCommon}
                  onChange={(e) => setModel((m) => ({ ...m, hasChildrenInCommon: e.target.value as any }))}
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-sm font-medium text-zinc-900">Hearing date (if known)</div>
              <input
                type="date"
                min={today}
                value={model.hearingDateIso || ""}
                onChange={(e) => setModel((m) => ({ ...m, hearingDateIso: e.target.value }))}
                className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={back}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canNextBasics}
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === "incident" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">3) Incident snapshot</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Keep it factual: date, location, what happened, quotes/witnesses, and impact.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-900">Main incident date (approx ok)</label>
                <input
                  type="date"
                  value={model.incidentDateIso || ""}
                  onChange={(e) => setModel((m) => ({ ...m, incidentDateIso: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-900">What happened? (20+ characters)</label>
              <textarea
                rows={5}
                value={model.incidentSummary || ""}
                onChange={(e) => setModel((m) => ({ ...m, incidentSummary: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                placeholder="Date, location, actions, quotes, witnesses, impact."
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={back}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canNextIncident}
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === "requests" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">4) Requested protections</h2>
            </div>

            <div className="grid gap-2">
              {REQUESTS.map((r) => {
                const on = model.requests.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRequest(r.id)}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      on
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="text-sm font-semibold">{r.label}</div>
                  </button>
                );
              })}
            </div>

            {model.requests.includes("other") && (
              <div>
                <label className="text-sm font-medium text-zinc-900">Other (short)</label>
                <input
                  value={model.requestOtherText || ""}
                  onChange={(e) => setModel((m) => ({ ...m, requestOtherText: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  placeholder="Describe other requested protections"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={back}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canNextRequests}
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Finish
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">DVRO intake saved</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Next: go to Ask THOXIE. It will automatically pull your DVRO intake into chat context.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
              <div className="font-semibold text-zinc-950">Snapshot</div>
              <div className="mt-2 grid gap-1">
                <div><span className="font-medium">County:</span> {model.county || "—"}</div>
                <div><span className="font-medium">Role:</span> {model.role}</div>
                <div><span className="font-medium">Stage:</span> {model.stage}</div>
                <div><span className="font-medium">Children in common:</span> {model.hasChildrenInCommon || "—"}</div>
                <div><span className="font-medium">Hearing date:</span> {model.hearingDateIso || "—"}</div>
                <div><span className="font-medium">Incident date:</span> {model.incidentDateIso || "—"}</div>
                <div><span className="font-medium">Requests:</span> {model.requests.join(", ")}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => go("role_stage")}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Edit intake
              </button>

              <Link
                href="/signup"
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 text-center"
              >
                Go to Ask THOXIE
              </Link>
            </div>
          </div>
        )}
      </section>

      <div className="mt-6 text-xs text-zinc-500">
        If you are in immediate danger, call emergency services. THOXIE is decision-support only.
      </div>
    </main>
  );
}

