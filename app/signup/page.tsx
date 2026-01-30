// app/signup/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CA_COUNTIES } from "@/lib/caCounties";
import { useCaseStore } from "@/lib/caseStore";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  county: string;
  caseStage: string;
  children: string;
  education: string;
  employment: string;
  income: string;
  notes: string;
};

export default function SignupPage() {
  const caseStore = useCaseStore();
  const counties = useMemo(() => CA_COUNTIES, []);

  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    password: "",
    county: caseStore.county || "San Mateo",
    caseStage: caseStore.caseStage || "Early / just starting",
    children: caseStore.children ?? "No",
    education: caseStore.education ?? "",
    employment: caseStore.employment ?? "",
    income: caseStore.income ?? "",
    notes: caseStore.notes ?? "",
  });

  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Persist to store for later use in app
    caseStore.setCounty(form.county);
    caseStore.setCaseStage(form.caseStage);
    caseStore.setChildren(form.children);
    caseStore.setEducation(form.education);
    caseStore.setEmployment(form.employment);
    caseStore.setIncome(form.income);
    caseStore.setNotes(form.notes);

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 18px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.02em" }}>THOXIE</h1>
            <p style={{ margin: "6px 0 0 0", opacity: 0.75 }}>
              Account created (prototype). Your intake has been saved.
            </p>
          </div>
          <Link href="/" style={{ textDecoration: "underline" }}>
            Back to home
          </Link>
        </header>

        <div className="card" style={{ marginTop: 22 }}>
          <div className="cardHeader">
            <h2 style={{ margin: 0, fontSize: 18 }}>Next steps</h2>
            <p style={{ margin: "6px 0 0 0", opacity: 0.75 }}>
              Go back to the home screen and start asking questions.
            </p>
          </div>

          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Use “Ask THOXIE” to generate checklists, draft language, and strategy options.</li>
            <li>Update intake any time (county, stage, notes) for better tailoring.</li>
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 18px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.02em" }}>THOXIE</h1>
          <p style={{ margin: "6px 0 0 0", opacity: 0.75 }}>
            Create an account (prototype) — Family Law only.
          </p>
        </div>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Back to home
        </Link>
      </header>

      <form onSubmit={onSubmit} className="card" style={{ marginTop: 22 }}>
        <div className="cardHeader">
          <h2 style={{ margin: 0, fontSize: 18 }}>Sign up</h2>
          <p style={{ margin: "6px 0 0 0", opacity: 0.75 }}>
            We’ll use this intake to tune tone and output quality.
          </p>
        </div>

        <div className="grid2">
          <label className="field">
            <span>Full name</span>
            <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Name" />
          </label>

          <label className="field">
            <span>Email</span>
            <input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@email.com" />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <label className="field">
            <span>California county</span>
            <select value={form.county} onChange={(e) => update("county", e.target.value)}>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Case stage</span>
            <select value={form.caseStage} onChange={(e) => update("caseStage", e.target.value)}>
              <option>Early / just starting</option>
              <option>Filed / awaiting response</option>
              <option>Temporary orders / RFO</option>
              <option>Discovery / disclosures</option>
              <option>Mediation / settlement</option>
              <option>Trial prep</option>
              <option>Post-judgment / enforcement</option>
            </select>
          </label>

          <label className="field">
            <span>Children involved?</span>
            <select value={form.children} onChange={(e) => update("children", e.target.value)}>
              <option>No</option>
              <option>Yes</option>
              <option>Not sure</option>
            </select>
          </label>

          <label className="field">
            <span>Education (required)</span>
            <input
              value={form.education}
              onChange={(e) => update("education", e.target.value)}
              placeholder="e.g., BA / JD / HS / etc."
              required
            />
          </label>

          <label className="field">
            <span>Employment (required)</span>
            <input
              value={form.employment}
              onChange={(e) => update("employment", e.target.value)}
              placeholder="e.g., Self-employed / W2 / Unemployed"
              required
            />
          </label>

          <label className="field">
            <span>Income (optional)</span>
            <input
              value={form.income}
              onChange={(e) => update("income", e.target.value)}
              placeholder="e.g., 180000"
            />
            <small className="hint">Numbers only; approximate is fine.</small>
          </label>
        </div>

        <label className="field" style={{ marginTop: 12 }}>
          <span>Anything else (optional)</span>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Brief facts, goals, deadlines…"
          />
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="submit">Create account</button>
          <Link href="/" className="btnLink">
            Cancel
          </Link>
        </div>

        <p className="footerNote">
          Prototype only. THOXIE provides decision support and drafting assistance — it is not a law firm and does not
          provide legal advice.
        </p>
      </form>
    </main>
  );
}



