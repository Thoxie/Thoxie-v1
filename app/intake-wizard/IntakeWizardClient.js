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
  // NOTE: storageKey is deprecated; drafts now live in CaseRepository under caseId.
  storageKey = "thoxie:intakeWizard:draft:v1",
}) {
  // -----------------------------
  // Constants / options
  // -----------------------------
  const STEPS = useMemo(
    () => [
      { id: "role", title: "Role" },
      { id: "jurisdiction", title: "Jurisdiction" },
      { id: "parties", title: "Parties" },
      { id: "claim", title: "Claim" },
      { id: "hearing", title: "Hearing" },
      { id: "evidence", title: "Evidence" },
      { id: "review", title: "Review" },
    ],
    []
  );

  // -----------------------------
  // Form state
  // -----------------------------
  const [form, setForm] = useState(() => ({
    // Core
    role: "plaintiff",
    state: "CA",

    // Jurisdiction
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

    // Defendant-only basics (optional)
    caseNumber: "",

    // Claim
    amountDemanded: "",
    claimType: "",
    incidentDate: "",
    narrative: "",

    // Hearing
    hearingDate: "",
    hearingTime: "",

    // Evidence (UI-only list here; wire to DocumentRepository later)
    evidenceFiles: [], // { name, size, type, lastModified }
  }));

  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // -----------------------------
  // Stable Case ID for drafts
  // -----------------------------
  const generatedIdRef = useRef(null);
  if (!generatedIdRef.current) {
    generatedIdRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `case-${Date.now()}`;
  }

  const effectiveCaseId = useMemo(() => {
    return caseId || initialCase?.id || generatedIdRef.current;
  }, [caseId, initialCase]);

  const [error, setError] = useState("");
  const didInitRef = useRef(true);

  // -----------------------------
  // Mock jurisdiction data (CA)
  // -----------------------------
  const CA_COUNTIES = useMemo(
    () => [
      "Alameda",
      "Contra Costa",
      "Los Angeles",
      "Orange",
      "Riverside",
      "San Diego",
      "San Francisco",
      "San Mateo",
      "Santa Clara",
    ],
    []
  );

  const CA_COURTS = useMemo(
    () => ({
      "San Mateo": [
        {
          id: "smc-redwood-city",
          name: "San Mateo County Superior Court — Redwood City",
          address: "400 County Center, Redwood City, CA 94063",
        },
        {
          id: "smc-south-san-francisco",
          name: "San Mateo County Superior Court — South San Francisco",
          address: "1050 Mission Rd, South San Francisco, CA 94080",
        },
      ],
      "Santa Clara": [
        {
          id: "scc-san-jose",
          name: "Santa Clara County Superior Court — San Jose",
          address: "191 N First St, San Jose, CA 95113",
        },
      ],
      "San Francisco": [
        {
          id: "sfc-400-mcallister",
          name: "San Francisco Superior Court — Civic Center",
          address: "400 McAllister St, San Francisco, CA 94102",
        },
      ],
      "Los Angeles": [
        {
          id: "la-stanley-mosk",
          name: "Los Angeles Superior Court — Stanley Mosk",
          address: "111 N Hill St, Los Angeles, CA 90012",
        },
      ],
    }),
    []
  );

  // -----------------------------
  // Init: load initialCase OR draft (CaseRepository)
  // -----------------------------
  useEffect(() => {
    if (!didInitRef.current) return;
    didInitRef.current = false;

    try {
      // 1) If initialCase provided, prefer it.
      if (initialCase && typeof initialCase === "object") {
        setForm((prev) => hydrateFromInitial(prev, initialCase));
        return;
      }

      // 2) Else load draft from CaseRepository (case-scoped).
      const draft = CaseRepository.getDraft(effectiveCaseId);
      const parsed = draft && draft.data ? draft.data : null;
      if (!parsed || typeof parsed !== "object") return;

      setForm((prev) => ({
        ...prev,
        ...safePick(parsed, Object.keys(prev)),
      }));

      // restore step position if present
      if (typeof parsed.__activeStepIndex === "number") {
        setActiveStepIndex(clamp(parsed.__activeStepIndex, 0, STEPS.length - 1));
      }
    } catch {
      // ignore draft load errors
    }
  }, [initialCase, effectiveCaseId, STEPS.length]);

  // Persist draft on change (debounced-ish)
  useEffect(() => {
    try {
      const payload = {
        ...form,
        __activeStepIndex: activeStepIndex,
        __savedAt: new Date().toISOString(),
      };
      CaseRepository.saveDraft(effectiveCaseId, payload);
    } catch {
      // ignore storage errors
    }
  }, [form, activeStepIndex, effectiveCaseId]);

  // -----------------------------
  // Derived
  // -----------------------------
  const courtsForCounty = useMemo(() => {
    const list = CA_COURTS[form.county] || [];
    return list;
  }, [CA_COURTS, form.county]);

  const activeStep = STEPS[activeStepIndex];

  // -----------------------------
  // Handlers
  // -----------------------------
  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSelectCounty(county) {
    setForm((prev) => ({
      ...prev,
      county,
      courtId: "",
      courtName: "",
      courtAddress: "",
    }));
  }

  function onSelectCourt(courtId) {
    const found = (courtsForCounty || []).find((c) => c.id === courtId);
    setForm((prev) => ({
      ...prev,
      courtId,
      courtName: found?.name || "",
      courtAddress: found?.address || "",
    }));
  }

  function addEvidenceFiles(fileList) {
    const next = Array.from(fileList || []).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified,
    }));

    setForm((prev) => ({
      ...prev,
      evidenceFiles: [...(prev.evidenceFiles || []), ...next],
    }));
  }

  function removeEvidenceFile(idx) {
    setForm((prev) => ({
      ...prev,
      evidenceFiles: (prev.evidenceFiles || []).filter((_, i) => i !== idx),
    }));
  }

  function saveDraftNow() {
    const payload = {
      ...buildPayload(form),
      __activeStepIndex: activeStepIndex,
      __savedAt: new Date().toISOString(),
    };
    try {
      CaseRepository.saveDraft(effectiveCaseId, payload);
    } catch {
      // ignore
    }
    if (typeof onSaveDraft === "function") onSaveDraft(payload);
  }

  function next() {
    setError("");
    const validation = validateStep(STEPS[activeStepIndex]?.id, form);
    if (!validation.ok) {
      setError(validation.message || "Please complete the required fields.");
      return;
    }
    setActiveStepIndex((i) => clamp(i + 1, 0, STEPS.length - 1));
  }

  function back() {
    setError("");
    setActiveStepIndex((i) => clamp(i - 1, 0, STEPS.length - 1));
  }

  function finish() {
    setError("");
    const validation = validateAll(form);
    if (!validation.ok) {
      setError(validation.message || "Please correct the highlighted fields before continuing.");
      return;
    }
    const payload = buildPayload(form);
    if (typeof onComplete === "function") onComplete({ ...payload, caseId: effectiveCaseId });
  }

  // -----------------------------
  // Render helpers
  // -----------------------------
  function renderStep() {
    switch (activeStep?.id) {
      case "role":
        return renderRoleStep();
      case "jurisdiction":
        return renderJurisdictionStep();
      case "parties":
        return renderPartiesStep();
      case "claim":
        return renderClaimStep();
      case "hearing":
        return renderHearingStep();
      case "evidence":
        return renderEvidenceStep();
      case "review":
        return renderReviewStep();
      default:
        return null;
    }
  }

  function renderRoleStep() {
    return (
      <div>
        <h2 style={styles.h2}>Are you the plaintiff or defendant?</h2>

        <div style={styles.row}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              checked={form.role === "plaintiff"}
              onChange={() => updateField("role", "plaintiff")}
            />
            <span style={styles.radioText}>Plaintiff (I’m filing)</span>
          </label>

          <label style={styles.radioLabel}>
            <input
              type="radio"
              checked={form.role === "defendant"}
              onChange={() => updateField("role", "defendant")}
            />
            <span style={styles.radioText}>Defendant (I’m responding)</span>
          </label>
        </div>

        <div style={styles.note}>
          <div style={styles.noteTitle}>Tip</div>
          <div style={styles.noteBody}>
            Choose <b>Defendant</b> if you received court papers and need to respond.
          </div>
        </div>
      </div>
    );
  }

  function renderJurisdictionStep() {
    return (
      <div>
        <h2 style={styles.h2}>Where is the case filed?</h2>

        <div style={styles.fieldBlock}>
          <label style={styles.label}>State</label>
          <input style={styles.input} value="California" disabled />
        </div>

        <div style={styles.fieldBlock}>
          <label style={styles.label}>County</label>
          <select
            style={styles.select}
            value={form.county}
            onChange={(e) => onSelectCounty(e.target.value)}
          >
            <option value="">Select a county…</option>
            {CA_COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.fieldBlock}>
          <label style={styles.label}>Court</label>
          <select
            style={styles.select}
            value={form.courtId}
            onChange={(e) => onSelectCourt(e.target.value)}
            disabled={!form.county}
          >
            <option value="">Select a court…</option>
            {(courtsForCounty || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.fieldBlock}>
          <label style={styles.label}>Court address (locked)</label>
          <textarea style={styles.textarea} value={form.courtAddress} disabled rows={2} />
        </div>
      </div>
    );
  }

  function renderPartiesStep() {
    return (
      <div>
        <h2 style={styles.h2}>Parties</h2>

        <div style={styles.grid2}>
          <div>
            <h3 style={styles.h3}>Plaintiff</h3>
            <Field label="Full name" value={form.plaintiffName} onChange={(v) => updateField("plaintiffName", v)} />
            <Field label="Phone" value={form.plaintiffPhone} onChange={(v) => updateField("plaintiffPhone", v)} />
            <Field label="Email" value={form.plaintiffEmail} onChange={(v) => updateField("plaintiffEmail", v)} />
            <Field
              label="Address"
              value={form.plaintiffAddress}
              onChange={(v) => updateField("plaintiffAddress", v)}
              multiline
            />
          </div>

          <div>
            <h3 style={styles.h3}>Defendant</h3>
            <Field label="Full name" value={form.defendantName} onChange={(v) => updateField("defendantName", v)} />
            <Field label="Phone" value={form.defendantPhone} onChange={(v) => updateField("defendantPhone", v)} />
            <Field label="Email" value={form.defendantEmail} onChange={(v) => updateField("defendantEmail", v)} />
            <Field
              label="Address"
              value={form.defendantAddress}
              onChange={(v) => updateField("defendantAddress", v)}
              multiline
            />
          </div>
        </div>

        {form.role === "defendant" ? (
          <div style={styles.fieldBlock}>
            <label style={styles.label}>Case number (if known)</label>
            <input
              style={styles.input}
              value={form.caseNumber}
              onChange={(e) => updateField("caseNumber", e.target.value)}
              placeholder="e.g., 24-SCS-01234"
            />
          </div>
        ) : null}
      </div>
    );
  }

  function renderClaimStep() {
    return (
      <div>
        <h2 style={styles.h2}>Claim basics</h2>

        <div style={styles.grid2}>
          <Field
            label="Amount demanded (USD)"
            value={String(form.amountDemanded ?? "")}
            onChange={(v) => updateField("amountDemanded", v)}
            placeholder="e.g., 12500"
          />

          <Field
            label="Claim type"
            value={form.claimType}
            onChange={(v) => updateField("claimType", v)}
            placeholder="e.g., breach of contract"
          />
        </div>

        <div style={styles.grid2}>
          <Field
            label="Incident date (optional)"
            value={form.incidentDate}
            onChange={(v) => updateField("incidentDate", v)}
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div style={styles.fieldBlock}>
          <label style={styles.label}>Narrative (what happened)</label>
          <textarea
            style={styles.textarea}
            value={form.narrative}
            onChange={(e) => updateField("narrative", e.target.value)}
            rows={7}
            placeholder="Describe the key facts in chronological order. Keep it simple."
          />
        </div>
      </div>
    );
  }

  function renderHearingStep() {
    return (
      <div>
        <h2 style={styles.h2}>Key dates</h2>

        <div style={styles.grid2}>
          <Field
            label="Hearing date (optional)"
            value={form.hearingDate}
            onChange={(v) => updateField("hearingDate", v)}
            placeholder="YYYY-MM-DD"
          />

          <Field
            label="Hearing time (optional)"
            value={form.hearingTime}
            onChange={(v) => updateField("hearingTime", v)}
            placeholder="e.g., 9:00 AM"
          />
        </div>

        <div style={styles.note}>
          <div style={styles.noteTitle}>Note</div>
          <div style={styles.noteBody}>
            If you already have a court notice, you can paste or upload it on the Documents page later.
          </div>
        </div>
      </div>
    );
  }

  function renderEvidenceStep() {
    return (
      <div>
        <h2 style={styles.h2}>Evidence</h2>

        <div style={styles.note}>
          <div style={styles.noteTitle}>Beta note</div>
          <div style={styles.noteBody}>
            This is a placeholder list. The Documents page is the real upload pipeline (IndexedDB).
          </div>
        </div>

        <input
          type="file"
          multiple
          onChange={(e) => addEvidenceFiles(e.target.files)}
          style={{ marginTop: 8 }}
        />

        <div style={{ marginTop: 12 }}>
          {(form.evidenceFiles || []).length === 0 ? (
            <div style={styles.muted}>No files added here yet.</div>
          ) : (
            <ul style={styles.ul}>
              {(form.evidenceFiles || []).map((f, idx) => (
                <li key={`${f.name}-${idx}`} style={styles.li}>
                  <div>
                    <div style={styles.fileName}>{f.name}</div>
                    <div style={styles.fileMeta}>
                      {formatBytes(f.size)} · {f.type || "file"}
                    </div>
                  </div>
                  <button style={styles.linkButton} onClick={() => removeEvidenceFile(idx)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    const payload = buildPayload(form);
    return (
      <div>
        <h2 style={styles.h2}>Review</h2>

        <div style={styles.reviewBox}>
          <div style={styles.reviewRow}>
            <div style={styles.reviewLabel}>Role</div>
            <div style={styles.reviewValue}>{payload.role}</div>
          </div>

          <div style={styles.reviewRow}>
            <div style={styles.reviewLabel}>County</div>
            <div style={styles.reviewValue}>{payload.county || "—"}</div>
          </div>

          <div style={styles.reviewRow}>
            <div style={styles.reviewLabel}>Court</div>
            <div style={styles.reviewValue}>{payload.courtName || "—"}</div>
          </div>

          <div style={styles.reviewRow}>
            <div style={styles.reviewLabel}>Damages</div>
            <div style={styles.reviewValue}>
              {payload.amountDemanded != null && payload.amountDemanded !== ""
                ? `$${String(payload.amountDemanded)}`
                : "—"}
            </div>
          </div>

          <div style={styles.reviewRow}>
            <div style={styles.reviewLabel}>Plaintiff</div>
            <div style={styles.reviewValue}>{payload.plaintiffName || "—"}</div>
          </div>

          <div style={styles.reviewRow}>
            <div style={styles.reviewLabel}>Defendant</div>
            <div style={styles.reviewValue}>{payload.defendantName || "—"}</div>
          </div>

          <div style={styles.reviewRow}>
            <div style={styles.reviewLabel}>Case number</div>
            <div style={styles.reviewValue}>{payload.caseNumber || "—"}</div>
          </div>

          <div style={styles.reviewRow}>
            <div style={styles.reviewLabel}>Hearing</div>
            <div style={styles.reviewValue}>
              {payload.hearingDate || "—"} {payload.hearingTime ? `at ${payload.hearingTime}` : ""}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={styles.label}>Narrative</div>
          <div style={styles.narrativeBox}>{payload.narrative || "—"}</div>
        </div>

        <div style={styles.note}>
          <div style={styles.noteTitle}>Draft saving</div>
          <div style={styles.noteBody}>
            Your progress is auto-saved in your browser under this case. You can come back later.
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // Main render
  // -----------------------------
  return (
    <div style={styles.shell}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.kicker}>THOXIE</div>
          <div style={styles.title}>California Small Claims — Intake Wizard</div>
          <div style={styles.subTitle}>Draft case setup (local-first)</div>
        </div>

        <button style={styles.secondaryButton} onClick={saveDraftNow} type="button">
          Save draft
        </button>
      </div>

      <div style={styles.stepper}>
        {STEPS.map((s, i) => {
          const active = i === activeStepIndex;
          const done = i < activeStepIndex;
          return (
            <div key={s.id} style={{ ...styles.step, ...(active ? styles.stepActive : {}) }}>
              <div style={{ ...styles.stepDot, ...(done ? styles.stepDotDone : {}) }}>
                {done ? "✓" : i + 1}
              </div>
              <div style={styles.stepText}>{s.title}</div>
            </div>
          );
        })}
      </div>

      <div style={styles.card}>{renderStep()}</div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.footerRow}>
        <button style={styles.secondaryButton} onClick={back} disabled={activeStepIndex === 0} type="button">
          Back
        </button>

        {activeStep?.id === "review" ? (
          <button style={styles.primaryButton} onClick={finish} type="button">
            Finish → Documents
          </button>
        ) : (
          <button style={styles.primaryButton} onClick={next} type="button">
            Next
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------
// Helpers
// -----------------------------
function buildPayload(form) {
  const { evidenceFiles, amountDemanded, ...rest } = form;

  // normalize numeric
  const amountNum =
    amountDemanded === "" || amountDemanded == null
      ? null
      : Number(String(amountDemanded).replace(/[^0-9.]/g, ""));

  return {
    ...rest,
    amountDemanded: Number.isFinite(amountNum) ? amountNum : null,
    evidenceFiles: Array.isArray(evidenceFiles) ? evidenceFiles : [],
    updatedAt: new Date().toISOString(),
  };
}

function validateStep(stepId, form) {
  switch (stepId) {
    case "role":
      return { ok: true };
    case "jurisdiction":
      if (!form.county) return { ok: false, message: "Select a county." };
      if (!form.courtId) return { ok: false, message: "Select a court." };
      return { ok: true };
    case "parties":
      if (!form.plaintiffName) return { ok: false, message: "Enter the plaintiff name." };
      if (!form.defendantName) return { ok: false, message: "Enter the defendant name." };
      return { ok: true };
    case "claim":
      if (!String(form.amountDemanded || "").trim()) return { ok: false, message: "Enter damages amount." };
      if (!String(form.narrative || "").trim()) return { ok: false, message: "Enter a short narrative." };
      return { ok: true };
    default:
      return { ok: true };
  }
}

function validateAll(form) {
  const a = validateStep("jurisdiction", form);
  if (!a.ok) return a;
  const b = validateStep("parties", form);
  if (!b.ok) return b;
  const c = validateStep("claim", form);
  if (!c.ok) return c;
  return { ok: true };
}

function hydrateFromInitial(prev, initialCase) {
  // Map CaseSchema-ish fields back into wizard form
  return {
    ...prev,
    role: initialCase?.role || prev.role,
    county: initialCase?.jurisdiction?.county || prev.county,
    courtName: initialCase?.jurisdiction?.courtName || prev.courtName,
    courtAddress: initialCase?.jurisdiction?.courtAddress || prev.courtAddress,

    plaintiffName: initialCase?.parties?.plaintiff || prev.plaintiffName,
    defendantName: initialCase?.parties?.defendant || prev.defendantName,

    amountDemanded: initialCase?.damages ?? prev.amountDemanded,
    claimType: initialCase?.category ?? prev.claimType,
    narrative: initialCase?.facts ?? prev.narrative,

    caseNumber: initialCase?.caseNumber ?? prev.caseNumber,
    hearingDate: initialCase?.hearingDate ?? prev.hearingDate,
    hearingTime: initialCase?.hearingTime ?? prev.hearingTime,
  };
}

function safePick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n)));
}

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  const val = b / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function Field({ label, value, onChange, placeholder, multiline }) {
  return (
    <div style={styles.fieldBlock}>
      <label style={styles.label}>{label}</label>
      {multiline ? (
        <textarea
          style={styles.textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          style={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

// -----------------------------
// Styles (simple inline CSS)
// -----------------------------
const styles = {
  shell: {
    padding: 16,
    maxWidth: 980,
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  kicker: { fontSize: 12, opacity: 0.7, letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: 700 },
  subTitle: { fontSize: 13, opacity: 0.7, marginTop: 2 },

  stepper: { display: "flex", flexWrap: "wrap", gap: 10, margin: "10px 0 12px" },
  step: { display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 10, background: "#f3f4f6" },
  stepActive: { background: "#e5e7eb" },
  stepDot: { width: 22, height: 22, borderRadius: 999, background: "#fff", display: "grid", placeItems: "center", fontSize: 12 },
  stepDotDone: { background: "#d1fae5" },
  stepText: { fontSize: 12 },

  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 14 },

  h2: { fontSize: 16, fontWeight: 700, margin: "6px 0 12px" },
  h3: { fontSize: 14, fontWeight: 700, margin: "4px 0 10px" },

  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  fieldBlock: { marginBottom: 10 },
  label: { display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 },
  input: { width: "100%", border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 10px", fontSize: 14 },
  select: { width: "100%", border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 10px", fontSize: 14 },
  textarea: { width: "100%", border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 10px", fontSize: 14 },

  radioLabel: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 12 },
  radioText: { fontSize: 14 },

  note: { marginTop: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 },
  noteTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  noteBody: { fontSize: 13, opacity: 0.85 },

  muted: { fontSize: 13, opacity: 0.7 },

  ul: { listStyle: "none", padding: 0, margin: 0 },
  li: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" },
  fileName: { fontSize: 13, fontWeight: 600 },
  fileMeta: { fontSize: 12, opacity: 0.7, marginTop: 2 },

  reviewBox: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 },
  reviewRow: { display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid #f3f4f6" },
  reviewLabel: { fontSize: 12, opacity: 0.7 },
  reviewValue: { fontSize: 13, fontWeight: 600 },

  narrativeBox: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, fontSize: 13, whiteSpace: "pre-wrap" },

  footerRow: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12 },

  primaryButton: { border: 0, background: "#111827", color: "#fff", borderRadius: 12, padding: "10px 14px", fontSize: 14 },
  secondaryButton: { border: "1px solid #d1d5db", background: "#fff", borderRadius: 12, padding: "10px 14px", fontSize: 14 },
  linkButton: { border: 0, background: "transparent", color: "#2563eb", cursor: "pointer", fontSize: 13 },

  error: { marginTop: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: 10, fontSize: 13 },
};
