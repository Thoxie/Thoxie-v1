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

  // UI-only reassurance: “auto-saved” indicator timestamp
  const [lastSavedAt, setLastSavedAt] = useState("");

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

    // Evidence (placeholder)
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

    // UI-only: update timestamp so users see saving is happening
    try {
      const t = new Date();
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      const ss = String(t.getSeconds()).padStart(2, "0");
      setLastSavedAt(`${hh}:${mm}:${ss}`);
    } catch {}
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
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={styles.h1}>Small Claims Intake (CA)</div>

          <div
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              background: "#f1f6ff",
              border: "1px solid #d7e6ff",
              color: "#0b2a66",
              fontWeight: 700
            }}
            title="This intake draft is saved automatically in your browser."
          >
            Auto-saved{lastSavedAt ? ` at ${lastSavedAt}` : ""}
          </div>
        </div>

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

  // NOTE: The remaining functions/consts below are unchanged from your existing file content.
  // We keep them as-is to avoid any behavior changes.

  function renderClaimStep() {
    return (
      <div>
        <div style={styles.sectionTitle}>Claim</div>

        <div style={styles.grid2}>
          <Field label="Amount demanded" error={errors.amountDemanded}>
            <input
              style={styles.input}
              value={form.amountDemanded}
              onChange={(e) => updateField("amountDemanded", e.target.value)}
              placeholder="e.g., 5000"
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

        <Field label="Narrative (what happened)" error={errors.narrative}>
          <textarea
            style={styles.textarea}
            value={form.narrative}
            onChange={(e) => updateField("narrative", e.target.value)}
            rows={8}
            placeholder="Explain what happened in plain language. Include dates, amounts, and what you want the judge to order."
          />
        </Field>

        <div style={{ ...styles.note, marginTop: 14 }}>
          <div style={styles.noteTitle}>Tip</div>
          <div style={styles.noteBody}>
            Keep it factual and chronological. If you have documents, you can upload them in Documents after saving the case.
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
        <div style={styles.reviewBox}>
          <pre style={styles.pre}>{JSON.stringify(payload, null, 2)}</pre>
        </div>
        <div style={{ ...styles.note, marginTop: 14 }}>
          <div style={styles.noteTitle}>Note</div>
          <div style={styles.noteBody}>
            Clicking <b>Save Case</b> creates/updates a draft case and sends you to Documents.
          </div>
        </div>
      </div>
    );
  }
}

// ---------- helpers ----------

function safe(v) {
  return String(v || "").trim();
}

function parseAmount(v) {
  const s = String(v || "").replace(/[^0-9.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : "";
}

function safeReadLocalDraft(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function safeWriteLocalDraft(key, payload) {
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

// ---------- styles + Field component (unchanged) ----------

const styles = {
  page: { padding: "6px 0 24px 0" },
  header: { marginBottom: 10 },
  h1: { fontSize: 26, fontWeight: 900, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#333" },

  progressRow: { display: "flex", gap: 8, margin: "12px 0" },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    background: "#fff",
    color: "#999",
  },
  progressDotOn: { background: "#111", color: "#fff", borderColor: "#111" },

  card: { border: "1px solid #e6e6e6", borderRadius: 14, padding: 14, background: "#fff" },

  navRow: { display: "flex", justifyContent: "space-between", marginTop: 12, gap: 10 },
  navBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },
  navBtnPrimary: { background: "#111", color: "#fff", borderColor: "#111" },

  footerHint: { marginTop: 10, fontSize: 12, color: "#555" },

  sectionTitle: { fontWeight: 900, marginTop: 6, marginBottom: 10 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fieldBlock: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: 800, display: "block", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd" },
  select: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd" },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd" },

  note: { border: "1px solid #d7e6ff", background: "#f1f6ff", borderRadius: 14, padding: 12 },
  noteTitle: { fontWeight: 900, marginBottom: 4 },
  noteBody: { fontSize: 13, color: "#0b2a66", lineHeight: 1.45 },

  reviewBox: { border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" },
  pre: { margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" },
};

function Field({ label, error, children }) {
  return (
    <div style={styles.fieldBlock}>
      <label style={styles.label}>
        {label} {error ? <span style={{ color: "#b00020" }}>— {error}</span> : null}
      </label>
      {children}
    </div>
  );
}
