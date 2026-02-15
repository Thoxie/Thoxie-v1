// Path: /app/intake-wizard/IntakeWizardClient.js
// Thoxie-v1 — California Small Claims Intake Wizard (Client UI)
// Notes:
// - Client-only component (uses hooks + local persistence)
// - Designed to work even if backend endpoints are not wired yet
// - Emits a final "intakePayload" object to the caller via onComplete()

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CaseRepository } from "../_repository/caseRepository";

/**
 * Minimal, dependency-free intake wizard client.
 * - Role: plaintiff / defendant
 * - Jurisdiction: CA -> County -> Court (address locked after selection)
 * - Claim basics: amount, narrative, parties
 * - Evidence uploads: placeholder UI (wiring to DocumentRepository can be added later)
 *
 * Props:
 *  - initialCase (object | null): prefill data if editing
 *  - caseId (string | null): if provided, drafts are stored under this caseId
 *  - onComplete (fn): called with payload when wizard finishes
 *  - onSaveDraft (fn | optional): called with payload on draft save
 *  - storageKey (string | optional): DEPRECATED (kept only for backward compat)
 */
export default function IntakeWizardClient({
  initialCase = null,
  caseId = null,
  onComplete,
  onSaveDraft,
  storageKey,
}) {
  const draftKey = useMemo(() => {
    if (caseId) return `thoxie:intakeDraft:${caseId}`;
    if (storageKey) return storageKey;
    return "thoxie:intakeDraft:default";
  }, [caseId, storageKey]);

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const firstHydrateRef = useRef(false);

  const [form, setForm] = useState({
    role: "plaintiff",
    county: "",
    courtId: "",
    courtName: "",
    courtAddress: "",

    // Parties
    plaintiffName: "",
    plaintiffPhone: "",
    plaintiffEmail: "",
    plaintiffAddress: "",

    defendantName: "",
    defendantPhone: "",
    defendantEmail: "",
    defendantAddress: "",

    // Claim basics
    claimType: "",
    amountDemanded: "",
    incidentDate: "",
    narrative: "",

    // Optional: defendant view
    caseNumber: "",

    // Hearing
    hearingDate: "",
    hearingTime: "",

    // Filing / service (drives form checklist)
    serviceMethod: "", // "personal" | "substituted" | "mail" | "posting" | ""
    feeWaiverRequested: "", // "yes" | "no" | ""
    plaintiffUsesDba: "", // "yes" | "no" | ""

    // Additional parties (optional; one name per line)
    additionalPlaintiffs: "",
    additionalDefendants: "",

    // Evidence
    evidenceFiles: [],
  });

  // ---------- hydration (initialCase + saved draft) ----------

  useEffect(() => {
    if (firstHydrateRef.current) return;
    firstHydrateRef.current = true;

    // Prefer initialCase when editing; still load draft overlay if present.
    const draft = CaseRepository.getDraft(caseId) || safeReadLocalDraft(draftKey);

    if (initialCase) {
      setForm((prev) => hydrateFromInitial(prev, initialCase, draft));
      return;
    }

    if (draft) {
      setForm((prev) => ({ ...prev, ...safePickDraftFields(draft, prev) }));
    }
  }, [draftKey, initialCase, caseId]);

  // autosave draft
  useEffect(() => {
    const payload = buildPayload(form);
    safeWriteLocalDraft(draftKey, payload);
    if (typeof onSaveDraft === "function") onSaveDraft(payload);
    if (caseId) CaseRepository.saveDraft(caseId, payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function hydrateFromInitial(prev, initialCaseObj, draftOverlay) {
    const next = {
      ...prev,

      role: initialCaseObj?.role || prev.role,

      county: initialCaseObj?.jurisdiction?.county || prev.county,
      courtId: initialCaseObj?.jurisdiction?.courtId || prev.courtId,
      courtName: initialCaseObj?.jurisdiction?.courtName || prev.courtName,
      courtAddress: initialCaseObj?.jurisdiction?.courtAddress || prev.courtAddress,

      plaintiffName: initialCaseObj?.parties?.plaintiff || prev.plaintiffName,
      plaintiffPhone: initialCaseObj?.parties?.plaintiffPhone || prev.plaintiffPhone,
      plaintiffEmail: initialCaseObj?.parties?.plaintiffEmail || prev.plaintiffEmail,
      plaintiffAddress: initialCaseObj?.parties?.plaintiffAddress || prev.plaintiffAddress,

      defendantName: initialCaseObj?.parties?.defendant || prev.defendantName,
      defendantPhone: initialCaseObj?.parties?.defendantPhone || prev.defendantPhone,
      defendantEmail: initialCaseObj?.parties?.defendantEmail || prev.defendantEmail,
      defendantAddress: initialCaseObj?.parties?.defendantAddress || prev.defendantAddress,

      additionalPlaintiffs: Array.isArray(initialCaseObj?.parties?.additionalPlaintiffs)
        ? initialCaseObj.parties.additionalPlaintiffs.join("\n")
        : prev.additionalPlaintiffs,
      additionalDefendants: Array.isArray(initialCaseObj?.parties?.additionalDefendants)
        ? initialCaseObj.parties.additionalDefendants.join("\n")
        : prev.additionalDefendants,

      serviceMethod: initialCaseObj?.service?.method || prev.serviceMethod,
      feeWaiverRequested:
        typeof initialCaseObj?.feeWaiver?.requested === "boolean"
          ? initialCaseObj.feeWaiver.requested
            ? "yes"
            : "no"
          : prev.feeWaiverRequested,
      plaintiffUsesDba:
        typeof initialCaseObj?.claim?.plaintiffUsesDba === "boolean"
          ? initialCaseObj.claim.plaintiffUsesDba
            ? "yes"
            : "no"
          : prev.plaintiffUsesDba,

      claimType: initialCaseObj?.category || initialCaseObj?.claim?.reason || prev.claimType,
      amountDemanded: initialCaseObj?.damages ?? initialCaseObj?.claim?.amount ?? prev.amountDemanded,
      incidentDate: initialCaseObj?.claim?.incidentDate || prev.incidentDate,
      narrative: initialCaseObj?.facts || prev.narrative,

      caseNumber: initialCaseObj?.caseNumber || prev.caseNumber,
      hearingDate: initialCaseObj?.hearingDate || prev.hearingDate,
      hearingTime: initialCaseObj?.hearingTime || prev.hearingTime,
    };

    if (draftOverlay) {
      return { ...next, ...safePickDraftFields(draftOverlay, next) };
    }
    return next;
  }

  function safePickDraftFields(draftObj, shape) {
    const out = {};
    Object.keys(shape).forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(draftObj, k)) out[k] = draftObj[k];
    });
    return out;
  }

  // ---------- update helpers ----------

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  // ---------- navigation ----------

  const steps = useMemo(
    () => [
      { title: "Basics", render: renderBasicsStep },
      { title: "Parties", render: renderPartiesStep },
      { title: "Claim", render: renderClaimStep },
      { title: "Review", render: renderReviewStep },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, errors, step]
  );

  function next() {
    const ok = validateStep(step);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finish() {
    const ok = validateAll();
    if (!ok) return;
    if (typeof onComplete === "function") onComplete(buildPayload(form));
  }

  // ---------- validation ----------

  function validateStep(stepIndex) {
    const e = {};
    if (stepIndex === 0) {
      if (!safe(form.county)) e.county = "County is required.";
      if (!safe(form.courtName)) e.courtName = "Court is required.";
    }
    if (stepIndex === 1) {
      if (!safe(form.plaintiffName)) e.plaintiffName = "Plaintiff name is required.";
      if (!safe(form.defendantName)) e.defendantName = "Defendant name is required.";
    }
    if (stepIndex === 2) {
      if (!safe(form.claimType)) e.claimType = "Claim type is required.";
      if (!safe(form.amountDemanded)) e.amountDemanded = "Amount demanded is required.";
      if (!safe(form.narrative)) e.narrative = "Narrative is required.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateAll() {
    const ok0 = validateStep(0);
    const ok1 = validateStep(1);
    const ok2 = validateStep(2);
    return ok0 && ok1 && ok2;
  }

  function buildPayload(f) {
    return {
      role: f.role,

      county: f.county,
      courtId: f.courtId,
      courtName: f.courtName,
      courtAddress: f.courtAddress,

      plaintiffName: f.plaintiffName,
      plaintiffPhone: f.plaintiffPhone,
      plaintiffEmail: f.plaintiffEmail,
      plaintiffAddress: f.plaintiffAddress,

      defendantName: f.defendantName,
      defendantPhone: f.defendantPhone,
      defendantEmail: f.defendantEmail,
      defendantAddress: f.defendantAddress,

      additionalPlaintiffs: f.additionalPlaintiffs,
      additionalDefendants: f.additionalDefendants,

      claimType: f.claimType,
      amountDemanded: parseAmount(f.amountDemanded),
      incidentDate: f.incidentDate,
      narrative: f.narrative,

      serviceMethod: f.serviceMethod,
      feeWaiverRequested: f.feeWaiverRequested,
      plaintiffUsesDba: f.plaintiffUsesDba,

      caseNumber: f.caseNumber,
      hearingDate: f.hearingDate,
      hearingTime: f.hearingTime,

      evidenceFiles: f.evidenceFiles,
    };
  }

  // ---------- render ----------

  const current = steps[step];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.h1}>Small Claims Intake (CA)</div>
        <div style={styles.subtitle}>
          Step {step + 1} of {steps.length}: <b>{current.title}</b>
        </div>
      </div>

      <div style={styles.progressRow}>
        {steps.map((s, idx) => (
          <div key={s.title} style={{ ...styles.progressDot, ...(idx <= step ? styles.progressDotOn : {}) }}>
            {idx + 1}
          </div>
        ))}
      </div>

      <div style={styles.card}>{current.render()}</div>

      <div style={styles.navRow}>
        <button style={styles.navBtn} onClick={back} disabled={step === 0}>
          Back
        </button>

        {step < steps.length - 1 ? (
          <button style={{ ...styles.navBtn, ...styles.navBtnPrimary }} onClick={next}>
            Next
          </button>
        ) : (
          <button style={{ ...styles.navBtn, ...styles.navBtnPrimary }} onClick={finish}>
            Save Case
          </button>
        )}
      </div>

      <div style={styles.footerHint}>
        Drafts auto-save in your browser storage. Nothing is filed automatically.
      </div>
    </div>
  );

  // ---------- step UIs ----------

  function renderBasicsStep() {
    return (
      <div>
        <div style={styles.sectionTitle}>Role</div>
        <div style={styles.grid2}>
          <Field label="I am the…" error={null}>
            <select style={styles.select} value={form.role} onChange={(e) => updateField("role", e.target.value)}>
              <option value="plaintiff">Plaintiff (starting the case)</option>
              <option value="defendant">Defendant (responding)</option>
            </select>
          </Field>

          <Field label="Claim type" error={errors.claimType}>
            <input
              style={styles.input}
              value={form.claimType}
              onChange={(e) => updateField("claimType", e.target.value)}
              placeholder="e.g., unpaid invoice, deposit, property damage"
            />
          </Field>
        </div>

        <div style={styles.sectionTitle}>Court</div>
        <div style={styles.grid2}>
          <Field label="County" error={errors.county}>
            <input
              style={styles.input}
              value={form.county}
              onChange={(e) => updateField("county", e.target.value)}
              placeholder="e.g., San Mateo"
            />
          </Field>

          <Field label="Court name" error={errors.courtName}>
            <input
              style={styles.input}
              value={form.courtName}
              onChange={(e) => updateField("courtName", e.target.value)}
              placeholder="e.g., Superior Court of California, County of San Mateo"
            />
          </Field>
        </div>

        <Field label="Court address (optional)" error={null}>
          <input
            style={styles.input}
            value={form.courtAddress}
            onChange={(e) => updateField("courtAddress", e.target.value)}
            placeholder="Street address of courthouse"
          />
        </Field>

        <div style={{ ...styles.note, marginTop: 14 }}>
          <div style={styles.noteTitle}>Tip</div>
          <div style={styles.noteBody}>
            For beta, you can type the court name/address manually. Later we can hard-link county → court address in the
            jurisdiction config.
          </div>
        </div>
      </div>
    );
  }

  function renderPartiesStep() {
    return (
      <div>
        <div style={styles.sectionTitle}>Plaintiff</div>
        <div style={styles.grid2}>
          <Field label="Plaintiff full legal name" error={errors.plaintiffName}>
            <input
              style={styles.input}
              value={form.plaintiffName}
              onChange={(e) => updateField("plaintiffName", e.target.value)}
              placeholder="Full legal name"
            />
          </Field>

          <Field label="Phone (optional)" error={null}>
            <input
              style={styles.input}
              value={form.plaintiffPhone}
              onChange={(e) => updateField("plaintiffPhone", e.target.value)}
              placeholder="(###) ###-####"
            />
          </Field>
        </div>

        <div style={styles.grid2}>
          <Field label="Email (optional)" error={null}>
            <input
              style={styles.input}
              value={form.plaintiffEmail}
              onChange={(e) => updateField("plaintiffEmail", e.target.value)}
              placeholder="name@email.com"
            />
          </Field>

          <Field label="Address (optional)" error={null}>
            <input
              style={styles.input}
              value={form.plaintiffAddress}
              onChange={(e) => updateField("plaintiffAddress", e.target.value)}
              placeholder="Street, City, State, Zip"
            />
          </Field>
        </div>

        <div style={styles.sectionTitle}>Defendant</div>
        <div style={styles.grid2}>
          <Field label="Defendant full legal name" error={errors.defendantName}>
            <input
              style={styles.input}
              value={form.defendantName}
              onChange={(e) => updateField("defendantName", e.target.value)}
              placeholder="Full legal name"
            />
          </Field>

          <Field label="Phone (optional)" error={null}>
            <input
              style={styles.input}
              value={form.defendantPhone}
              onChange={(e) => updateField("defendantPhone", e.target.value)}
              placeholder="(###) ###-####"
            />
          </Field>
        </div>

        <div style={styles.grid2}>
          <Field label="Email (optional)" error={null}>
            <input
              style={styles.input}
              value={form.defendantEmail}
              onChange={(e) => updateField("defendantEmail", e.target.value)}
              placeholder="name@email.com"
            />
          </Field>

          <Field label="Address (optional)" error={null}>
            <input
              style={styles.input}
              value={form.defendantAddress}
              onChange={(e) => updateField("defendantAddress", e.target.value)}
              placeholder="Street, City, State, Zip"
            />
          </Field>
        </div>

        <div style={{ ...styles.note, marginTop: 14 }}>
          <div style={styles.noteTitle}>Optional</div>
          <div style={styles.noteBody}>
            If there are multiple plaintiffs or defendants, add the additional names below (one per line).
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.fieldBlock}>
            <label style={styles.label}>Additional plaintiffs (optional)</label>
            <textarea
              style={styles.textarea}
              value={form.additionalPlaintiffs}
              onChange={(e) => updateField("additionalPlaintiffs", e.target.value)}
              rows={4}
              placeholder="One name per line"
            />
          </div>

          <div style={styles.fieldBlock}>
            <label style={styles.label}>Additional defendants (optional)</label>
            <textarea
              style={styles.textarea}
              value={form.additionalDefendants}
              onChange={(e) => updateField("additionalDefendants", e.target.value)}
              rows={4}
              placeholder="One name per line"
            />
          </div>
        </div>

        {form.role === "defendant" ? (
          <div style={styles.fieldBlock}>
            <label style={styles.label}>Case number (optional)</label>
            <input
              style={styles.input}
              value={form.caseNumber}
              onChange={(e) => updateField("caseNumber", e.target.value)}
              placeholder="If you have it"
            />
          </div>
        ) : null}
      </div>
    );
  }

  function renderClaimStep() {
    return (
      <div>
        <div style={styles.sectionTitle}>Claim details</div>

        <div style={styles.grid2}>
          <Field label="Amount demanded" error={errors.amountDemanded}>
            <input
              style={styles.input}
              value={String(form.amountDemanded)}
              onChange={(e) => updateField("amountDemanded", e.target.value)}
              placeholder="e.g., 2500"
            />
          </Field>

          <Field label="Incident date (optional)" error={null}>
            <input
              style={styles.input}
              value={form.incidentDate}
              onChange={(e) => updateField("incidentDate", e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </Field>
        </div>

        <div style={styles.fieldBlock}>
          <label style={styles.label}>Narrative (what happened)</label>
          <textarea
            style={styles.textarea}
            value={form.narrative}
            onChange={(e) => updateField("narrative", e.target.value)}
            rows={8}
            placeholder="Describe what happened in plain English. Keep it factual."
          />
          {errors.narrative ? <div style={styles.errorText}>{errors.narrative}</div> : null}
        </div>

        <div style={{ ...styles.note, marginTop: 14 }}>
          <div style={styles.noteTitle}>Filing details (helps choose forms)</div>
          <div style={styles.noteBody}>
            These answers do not file anything. They just help Thoxie show the right California forms.
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.fieldBlock}>
            <label style={styles.label}>How will the defendant be served? (optional)</label>
            <select
              style={styles.select}
              value={form.serviceMethod}
              onChange={(e) => updateField("serviceMethod", e.target.value)}
            >
              <option value="">Select…</option>
              <option value="personal">Personal service</option>
              <option value="substituted">Substituted service</option>
              <option value="mail">Service by mail (if allowed)</option>
              <option value="posting">Posting (if allowed)</option>
            </select>
          </div>

          <div style={styles.fieldBlock}>
            <label style={styles.label}>Are you requesting a fee waiver? (optional)</label>
            <select
              style={styles.select}
              value={form.feeWaiverRequested}
              onChange={(e) => updateField("feeWaiverRequested", e.target.value)}
            >
              <option value="">Select…</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.fieldBlock}>
            <label style={styles.label}>Are you suing as a business using a DBA/fictitious business name? (optional)</label>
            <select
              style={styles.select}
              value={form.plaintiffUsesDba}
              onChange={(e) => updateField("plaintiffUsesDba", e.target.value)}
            >
              <option value="">Select…</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    const payload = buildPayload(form);
    return (
      <div>
        <div style={styles.sectionTitle}>Review</div>

        <pre style={styles.pre}>{JSON.stringify(payload, null, 2)}</pre>

        <div style={{ ...styles.note, marginTop: 14 }}>
          <div style={styles.noteTitle}>Next</div>
          <div style={styles.noteBody}>
            When you click <b>Save Case</b>, this intake is saved locally and you’ll be taken to Documents.
          </div>
        </div>
      </div>
    );
  }
}

/* ---------------------- UI primitives ---------------------- */

function Field({ label, error, children }) {
  return (
    <div style={styles.fieldBlock}>
      <label style={styles.label}>{label}</label>
      {children}
      {error ? <div style={styles.errorText}>{error}</div> : null}
    </div>
  );
}

/* ---------------------- storage helpers ---------------------- */

function safeReadLocalDraft(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeWriteLocalDraft(key, obj) {
  try {
    window.localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

/* ---------------------- misc helpers ---------------------- */

function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return s.trim();
}

function parseAmount(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (!s) return "";
  const n = Number(s.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return s;
  return n;
}

/* ---------------------- styles ---------------------- */

const styles = {
  page: { maxWidth: 880, margin: "0 auto", padding: "18px 16px 30px" },
  header: { marginBottom: 14 },
  h1: { fontSize: 24, fontWeight: 900, lineHeight: 1.2 },
  subtitle: { marginTop: 6, color: "#555" },
  progressRow: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid #ddd",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    color: "#777",
    background: "#fff",
  },
  progressDotOn: { background: "#111", color: "#fff", borderColor: "#111" },
  card: { border: "1px solid #ddd", borderRadius: 14, padding: 14, background: "#fff" },
  sectionTitle: { fontWeight: 900, marginBottom: 10, marginTop: 6, fontSize: 14 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fieldBlock: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  label: { fontWeight: 800, fontSize: 13, color: "#333" },
  input: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  },
  select: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  textarea: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    minHeight: 120,
    resize: "vertical",
  },
  errorText: { color: "#b91c1c", fontWeight: 800, fontSize: 13 },
  navRow: { display: "flex", justifyContent: "space-between", marginTop: 12, gap: 10 },
  navBtn: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 900,
    background: "#fff",
    cursor: "pointer",
  },
  navBtnPrimary: { background: "#111", color: "#fff", borderColor: "#111" },
  footerHint: { marginTop: 14, color: "#666", fontSize: 13 },
  note: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, background: "#f9fafb" },
  noteTitle: { fontWeight: 900, marginBottom: 6 },
  noteBody: { color: "#555", lineHeight: 1.55 },
  pre: {
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
    background: "#0b1020",
    color: "#e5e7eb",
    overflowX: "auto",
    fontSize: 12,
    lineHeight: 1.5,
  },
};

