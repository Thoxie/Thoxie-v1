// Path: /app/intake-wizard/IntakeWizardClient.js
// Thoxie-v1 — California Small Claims Intake Wizard (Client UI)

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CaseRepository } from "../_repository/caseRepository";
import CA_JURISDICTION from "../_config/jurisdictions/ca";

/**
 * Intake Wizard Client
 * Goals in this revision:
 * - Add dropdowns for Claim Type, County, and Court
 * - Auto-fill Court Name + Address from Court selection
 * - Require phone/email + structured address fields (street/city/state/zip)
 * - Phone formatting on blur
 * - Incident date required with proper date input (estimate allowed)
 * - Review step: human-readable (not JSON/code)
 *
 * No backend changes. Draft save behavior remains the same.
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

  // UI-only reassurance
  const [lastSavedAt, setLastSavedAt] = useState("");

  const claimTypeOptions = useMemo(
    () => [
      "Unpaid invoice / services",
      "Unpaid rent / money owed",
      "Security deposit",
      "Property damage",
      "Breach of contract",
      "Refund / return dispute",
      "Loan not repaid",
      "Auto / repair dispute",
      "Other",
    ],
    []
  );

  const countyOptions = useMemo(() => {
    const rows = Array.isArray(CA_JURISDICTION?.counties) ? CA_JURISDICTION.counties : [];
    return rows.map((x) => x.county).filter(Boolean);
  }, []);

  const courtsForSelectedCounty = useMemo(() => {
    const rows = Array.isArray(CA_JURISDICTION?.counties) ? CA_JURISDICTION.counties : [];
    const found = rows.find((x) => x.county === form.county);
    return Array.isArray(found?.courts) ? found.courts : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* depends on form.county */]);

  const [form, setForm] = useState({
    role: "plaintiff",

    // Jurisdiction
    county: "",
    courtId: "",
    courtName: "",
    courtAddress: "",

    // Parties
    plaintiffName: "",
    plaintiffPhone: "",
    plaintiffEmail: "",
    plaintiffStreet: "",
    plaintiffCity: "",
    plaintiffState: "CA",
    plaintiffZip: "",

    defendantName: "",
    defendantPhone: "",
    defendantEmail: "",
    defendantStreet: "",
    defendantCity: "",
    defendantState: "CA",
    defendantZip: "",

    // Claim basics
    claimType: "",
    claimTypeOther: "",
    amountDemanded: "",
    incidentDate: "",
    incidentDateIsEstimate: true,
    narrative: "",

    // Optional: defendant view
    caseNumber: "",

    // Hearing
    hearingDate: "",
    hearingTime: "",

    // Filing / service (drives form checklist)
    serviceMethod: "",
    feeWaiverRequested: "",
    plaintiffUsesDba: "",

    additionalPlaintiffs: "",
    additionalDefendants: "",

    evidenceFiles: [],
  });

  // ---------- hydration (initialCase + saved draft) ----------
  useEffect(() => {
    if (firstHydrateRef.current) return;
    firstHydrateRef.current = true;

    const draft = CaseRepository.getDraft(caseId) || safeReadLocalDraft(draftKey);

    if (initialCase) {
      setForm((prev) => hydrateFromInitial(prev, initialCase, draft));
      return;
    }

    if (draft) {
      setForm((prev) => ({ ...prev, ...safePickDraftFields(draft, prev) }));
    }
  }, [draftKey, initialCase, caseId]);

  // autosave draft (no behavior changes: just persists)
  useEffect(() => {
    const payload = buildPayload(form);
    safeWriteLocalDraft(draftKey, payload);
    if (typeof onSaveDraft === "function") onSaveDraft(payload);
    if (caseId) CaseRepository.saveDraft(caseId, payload);

    // UI-only timestamp
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
    const plaintiffAddr = splitAddress(initialCaseObj?.parties?.plaintiffAddress || "");
    const defendantAddr = splitAddress(initialCaseObj?.parties?.defendantAddress || "");

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
      plaintiffStreet: plaintiffAddr.street || prev.plaintiffStreet,
      plaintiffCity: plaintiffAddr.city || prev.plaintiffCity,
      plaintiffState: plaintiffAddr.state || prev.plaintiffState,
      plaintiffZip: plaintiffAddr.zip || prev.plaintiffZip,

      defendantName: initialCaseObj?.parties?.defendant || prev.defendantName,
      defendantPhone: initialCaseObj?.parties?.defendantPhone || prev.defendantPhone,
      defendantEmail: initialCaseObj?.parties?.defendantEmail || prev.defendantEmail,
      defendantStreet: defendantAddr.street || prev.defendantStreet,
      defendantCity: defendantAddr.city || prev.defendantCity,
      defendantState: defendantAddr.state || prev.defendantState,
      defendantZip: defendantAddr.zip || prev.defendantZip,

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

    if (draftOverlay) return { ...next, ...safePickDraftFields(draftOverlay, next) };
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

  function handleCountyChange(county) {
    // When county changes, reset court selection (UI consistency)
    updateField("county", county);
    setForm((prev) => ({
      ...prev,
      county,
      courtId: "",
      courtName: "",
      courtAddress: "",
    }));
  }

  function handleCourtChange(courtId) {
    const court = courtsForSelectedCounty.find((x) => x.courtId === courtId);
    setForm((prev) => ({
      ...prev,
      courtId,
      courtName: court?.name || "",
      courtAddress: court?.address || "",
    }));
    setErrors((prev) => ({ ...prev, courtId: "" }));
  }

  function formatPhoneField(key) {
    const formatted = formatUSPhone(form[key]);
    setForm((prev) => ({ ...prev, [key]: formatted }));
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
      if (!safe(form.claimType)) e.claimType = "Claim type is required.";
      if (safe(form.claimType) === "Other" && !safe(form.claimTypeOther)) e.claimTypeOther = "Please specify claim type.";
      if (!safe(form.county)) e.county = "County is required.";
      if (!safe(form.courtId)) e.courtId = "Court is required.";
    }

    if (stepIndex === 1) {
      if (!safe(form.plaintiffName)) e.plaintiffName = "Plaintiff name is required.";
      if (!safe(form.plaintiffPhone)) e.plaintiffPhone = "Plaintiff phone is required.";
      if (!isLikelyEmail(form.plaintiffEmail)) e.plaintiffEmail = "Valid plaintiff email is required.";
      if (!safe(form.plaintiffStreet)) e.plaintiffStreet = "Street is required.";
      if (!safe(form.plaintiffCity)) e.plaintiffCity = "City is required.";
      if (!safe(form.plaintiffState)) e.plaintiffState = "State is required.";
      if (!isLikelyZip(form.plaintiffZip)) e.plaintiffZip = "Valid ZIP is required.";

      if (!safe(form.defendantName)) e.defendantName = "Defendant name is required.";
      if (!safe(form.defendantPhone)) e.defendantPhone = "Defendant phone is required.";
      if (!isLikelyEmail(form.defendantEmail)) e.defendantEmail = "Valid defendant email is required.";
      if (!safe(form.defendantStreet)) e.defendantStreet = "Street is required.";
      if (!safe(form.defendantCity)) e.defendantCity = "City is required.";
      if (!safe(form.defendantState)) e.defendantState = "State is required.";
      if (!isLikelyZip(form.defendantZip)) e.defendantZip = "Valid ZIP is required.";
    }

    if (stepIndex === 2) {
      if (!safe(form.amountDemanded)) e.amountDemanded = "Amount demanded is required.";
      if (!isMoneyish(form.amountDemanded)) e.amountDemanded = "Enter a valid amount (numbers only).";
      if (!safe(form.incidentDate)) e.incidentDate = "Incident date is required (estimate is OK).";
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
    const finalClaimType = safe(f.claimType) === "Other" ? safe(f.claimTypeOther) : safe(f.claimType);

    // Keep schema-compatible: store structured address as a single string.
    const plaintiffAddress = joinAddress(f.plaintiffStreet, f.plaintiffCity, f.plaintiffState, f.plaintiffZip);
    const defendantAddress = joinAddress(f.defendantStreet, f.defendantCity, f.defendantState, f.defendantZip);

    return {
      role: f.role,

      county: f.county,
      courtId: f.courtId,
      courtName: f.courtName,
      courtAddress: f.courtAddress,

      plaintiffName: f.plaintiffName,
      plaintiffPhone: f.plaintiffPhone,
      plaintiffEmail: f.plaintiffEmail,
      plaintiffAddress,

      defendantName: f.defendantName,
      defendantPhone: f.defendantPhone,
      defendantEmail: f.defendantEmail,
      defendantAddress,

      additionalPlaintiffs: f.additionalPlaintiffs,
      additionalDefendants: f.additionalDefendants,

      claimType: finalClaimType,
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
              fontWeight: 800
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
        <div style={styles.sectionTitle}>Basics</div>

        <div style={styles.grid2}>
          <Field label="I am the…" error={null}>
            <select style={styles.select} value={form.role} onChange={(e) => updateField("role", e.target.value)}>
              <option value="plaintiff">Plaintiff (starting the case)</option>
              <option value="defendant">Defendant (responding)</option>
            </select>
          </Field>

          <Field label="Claim type" error={errors.claimType || errors.claimTypeOther}>
            <select
              style={styles.select}
              value={form.claimType}
              onChange={(e) => updateField("claimType", e.target.value)}
            >
              <option value="">Select…</option>
              {claimTypeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {safe(form.claimType) === "Other" ? (
              <div style={{ marginTop: 8 }}>
                <input
                  style={styles.input}
                  value={form.claimTypeOther}
                  onChange={(e) => updateField("claimTypeOther", e.target.value)}
                  placeholder="Type the claim type"
                />
              </div>
            ) : null}
          </Field>
        </div>

        <div style={{ height: 10 }} />

        <div style={styles.sectionTitle}>Court</div>

        <div style={styles.grid2}>
          <Field label="County" error={errors.county}>
            <select
              style={styles.select}
              value={form.county}
              onChange={(e) => handleCountyChange(e.target.value)}
            >
              <option value="">Select…</option>
              {countyOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Court (filing location)" error={errors.courtId}>
            <select
              style={styles.select}
              value={form.courtId}
              onChange={(e) => handleCourtChange(e.target.value)}
              disabled={!safe(form.county)}
              title={!safe(form.county) ? "Select a county first" : ""}
            >
              <option value="">{safe(form.county) ? "Select…" : "Select a county first"}</option>
              {courtsForSelectedCounty.map((ct) => (
                <option key={ct.courtId} value={ct.courtId}>{ct.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ marginTop: 10 }}>
          <Field label="Court name" error={null}>
            <input style={{ ...styles.input, background: "#f7f7f7" }} value={form.courtName} readOnly />
          </Field>

          <Field label="Court address" error={null}>
            <input style={{ ...styles.input, background: "#f7f7f7" }} value={form.courtAddress} readOnly />
          </Field>
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

          <Field label="Phone (required)" error={errors.plaintiffPhone}>
            <input
              style={styles.input}
              value={form.plaintiffPhone}
              onChange={(e) => updateField("plaintiffPhone", e.target.value)}
              onBlur={() => formatPhoneField("plaintiffPhone")}
              placeholder="(###) ###-####"
              inputMode="tel"
            />
          </Field>
        </div>

        <div style={styles.grid2}>
          <Field label="Email (required)" error={errors.plaintiffEmail}>
            <input
              style={styles.input}
              value={form.plaintiffEmail}
              onChange={(e) => updateField("plaintiffEmail", e.target.value)}
              placeholder="name@email.com"
              inputMode="email"
            />
          </Field>

          <Field label="Street (required)" error={errors.plaintiffStreet}>
            <input
              style={styles.input}
              value={form.plaintiffStreet}
              onChange={(e) => updateField("plaintiffStreet", e.target.value)}
              placeholder="Street address"
            />
          </Field>
        </div>

        <div style={styles.grid4}>
          <Field label="City (required)" error={errors.plaintiffCity}>
            <input
              style={styles.input}
              value={form.plaintiffCity}
              onChange={(e) => updateField("plaintiffCity", e.target.value)}
              placeholder="City"
            />
          </Field>

          <Field label="State (required)" error={errors.plaintiffState}>
            <input
              style={styles.input}
              value={form.plaintiffState}
              onChange={(e) => updateField("plaintiffState", e.target.value)}
              placeholder="CA"
              maxLength={2}
            />
          </Field>

          <Field label="ZIP (required)" error={errors.plaintiffZip}>
            <input
              style={styles.input}
              value={form.plaintiffZip}
              onChange={(e) => updateField("plaintiffZip", e.target.value)}
              placeholder="#####"
              inputMode="numeric"
            />
          </Field>

          <div />
        </div>

        <div style={{ height: 8 }} />

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

          <Field label="Phone (required)" error={errors.defendantPhone}>
            <input
              style={styles.input}
              value={form.defendantPhone}
              onChange={(e) => updateField("defendantPhone", e.target.value)}
              onBlur={() => formatPhoneField("defendantPhone")}
              placeholder="(###) ###-####"
              inputMode="tel"
            />
          </Field>
        </div>

        <div style={styles.grid2}>
          <Field label="Email (required)" error={errors.defendantEmail}>
            <input
              style={styles.input}
              value={form.defendantEmail}
              onChange={(e) => updateField("defendantEmail", e.target.value)}
              placeholder="name@email.com"
              inputMode="email"
            />
          </Field>

          <Field label="Street (required)" error={errors.defendantStreet}>
            <input
              style={styles.input}
              value={form.defendantStreet}
              onChange={(e) => updateField("defendantStreet", e.target.value)}
              placeholder="Street address"
            />
          </Field>
        </div>

        <div style={styles.grid4}>
          <Field label="City (required)" error={errors.defendantCity}>
            <input
              style={styles.input}
              value={form.defendantCity}
              onChange={(e) => updateField("defendantCity", e.target.value)}
              placeholder="City"
            />
          </Field>

          <Field label="State (required)" error={errors.defendantState}>
            <input
              style={styles.input}
              value={form.defendantState}
              onChange={(e) => updateField("defendantState", e.target.value)}
              placeholder="CA"
              maxLength={2}
            />
          </Field>

          <Field label="ZIP (required)" error={errors.defendantZip}>
            <input
              style={styles.input}
              value={form.defendantZip}
              onChange={(e) => updateField("defendantZip", e.target.value)}
              placeholder="#####"
              inputMode="numeric"
            />
          </Field>

          <div />
        </div>

        <div style={{ ...styles.note, marginTop: 12 }}>
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
        <div style={styles.sectionTitle}>Claim</div>

        <div style={styles.grid2}>
          <Field label="Amount demanded (required)" error={errors.amountDemanded}>
            <input
              style={styles.input}
              value={form.amountDemanded}
              onChange={(e) => updateField("amountDemanded", e.target.value)}
              placeholder="e.g., 5000"
              inputMode="decimal"
            />
          </Field>

          <Field label="Incident date (required; estimate OK)" error={errors.incidentDate}>
            <input
              style={styles.input}
              type="date"
              value={form.incidentDate}
              onChange={(e) => updateField("incidentDate", e.target.value)}
            />
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555" }}>
              <input
                type="checkbox"
                checked={!!form.incidentDateIsEstimate}
                onChange={(e) => updateField("incidentDateIsEstimate", e.target.checked)}
              />
              <span>Date is an estimate (OK)</span>
            </div>
          </Field>
        </div>

        <Field label="Narrative (required)" error={errors.narrative}>
          <textarea
            style={styles.textarea}
            value={form.narrative}
            onChange={(e) => updateField("narrative", e.target.value)}
            rows={10}
            placeholder="Explain what happened in plain language. Include dates, amounts, and what you want the judge to order."
          />
        </Field>

        <div style={{ ...styles.note, marginTop: 12 }}>
          <div style={styles.noteTitle}>Tip</div>
          <div style={styles.noteBody}>
            Keep it factual and chronological. If you have documents, upload them in Documents after saving the case.
          </div>
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    const payload = buildPayload(form);

    const sections = [
      {
        title: "Court",
        rows: [
          ["County", payload.county],
          ["Court", payload.courtName],
          ["Address", payload.courtAddress],
        ],
      },
      {
        title: "Claim",
        rows: [
          ["Claim type", payload.claimType],
          ["Amount demanded", payload.amountDemanded ? `$${Number(payload.amountDemanded).toLocaleString()}` : ""],
          ["Incident date", payload.incidentDate ? `${payload.incidentDate}${form.incidentDateIsEstimate ? " (estimate OK)" : ""}` : ""],
        ],
      },
      {
        title: "Plaintiff",
        rows: [
          ["Name", payload.plaintiffName],
          ["Phone", payload.plaintiffPhone],
          ["Email", payload.plaintiffEmail],
          ["Address", payload.plaintiffAddress],
        ],
      },
      {
        title: "Defendant",
        rows: [
          ["Name", payload.defendantName],
          ["Phone", payload.defendantPhone],
          ["Email", payload.defendantEmail],
          ["Address", payload.defendantAddress],
        ],
      },
    ];

    return (
      <div>
        <div style={styles.sectionTitle}>Review</div>

        <div style={{ display: "grid", gap: 12 }}>
          {sections.map((s) => (
            <div key={s.title} style={styles.reviewCard}>
              <div style={styles.reviewTitle}>{s.title}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {s.rows.map(([k, v]) => (
                  <div key={k} style={styles.reviewRow}>
                    <div style={styles.reviewKey}>{k}</div>
                    <div style={styles.reviewVal}>{v || <span style={{ color: "#999" }}>—</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={styles.reviewCard}>
            <div style={styles.reviewTitle}>Narrative</div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 14 }}>
              {payload.narrative || <span style={{ color: "#999" }}>—</span>}
            </div>
          </div>
        </div>

        <div style={{ ...styles.note, marginTop: 12 }}>
          <div style={styles.noteTitle}>Next</div>
          <div style={styles.noteBody}>
            Clicking <b>Save Case</b> will take you to Documents to upload evidence and court papers.
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

function isMoneyish(v) {
  const s = String(v || "").replace(/,/g, "").trim();
  return /^[0-9]+(\.[0-9]{1,2})?$/.test(s);
}

function isLikelyEmail(v) {
  const s = String(v || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isLikelyZip(v) {
  const s = String(v || "").trim();
  return /^\d{5}(-\d{4})?$/.test(s);
}

function formatUSPhone(v) {
  const digits = String(v || "").replace(/\D/g, "");
  if (!digits) return "";
  const d = digits.slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function joinAddress(street, city, state, zip) {
  const s = safe(street);
  const c = safe(city);
  const st = safe(state);
  const z = safe(zip);
  const line2 = [c, st, z].filter(Boolean).join(", ").replace(/,\s*,/g, ", ").trim();
  return [s, line2].filter(Boolean).join("\n");
}

function splitAddress(addr) {
  const raw = String(addr || "").trim();
  if (!raw) return { street: "", city: "", state: "CA", zip: "" };

  const lines = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const street = lines[0] || "";

  const line2 = lines[1] || "";
  // naive parse: "City, ST, ZIP"
  const parts = line2.split(",").map((x) => x.trim()).filter(Boolean);
  const city = parts[0] || "";
  const state = (parts[1] || "").replace(/\s+/g, " ").trim() || "CA";
  const zip = (parts[2] || "").trim();

  return { street, city, state, zip };
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

// ---------- styles ----------
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
  grid4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 },

  fieldBlock: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: 800, display: "block", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd" },
  select: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", fontFamily: "system-ui, sans-serif" },

  note: { border: "1px solid #d7e6ff", background: "#f1f6ff", borderRadius: 14, padding: 12 },
  noteTitle: { fontWeight: 900, marginBottom: 4 },
  noteBody: { fontSize: 13, color: "#0b2a66", lineHeight: 1.45 },

  reviewCard: { border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fafafa" },
  reviewTitle: { fontWeight: 900, marginBottom: 10 },
  reviewRow: { display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "start" },
  reviewKey: { fontSize: 12, fontWeight: 900, color: "#555" },
  reviewVal: { fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" },
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
