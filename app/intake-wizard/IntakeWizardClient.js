// Path: /app/intake-wizard/IntakeWizardClient.js
// Thoxie-v1 — California Small Claims Intake Wizard (Client UI)
// Notes:
// - Client-only component (uses hooks + local persistence)
// - Designed to work even if backend endpoints are not wired yet
// - Emits a final "intakePayload" object to the caller via onComplete()

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Minimal, dependency-free intake wizard client.
 * - Role: plaintiff / defendant
 * - Jurisdiction: CA -> County -> Court (address locked after selection)
 * - Claim basics: amount, narrative, parties
 * - Evidence uploads: placeholder UI (wiring to DocumentRepository can be added later)
 *
 * Props:
 *  - initialCase (object | null): prefill data if editing
 *  - onComplete (fn): called with payload when wizard finishes
 *  - onSaveDraft (fn | optional): called with payload on draft save
 *  - storageKey (string | optional): localStorage key for draft persistence
 */
export default function IntakeWizardClient({
  initialCase = null,
  onComplete,
  onSaveDraft,
  storageKey = "thoxie:intakeWizard:draft:v1",
}) {
  // -----------------------------
  // Constants / options
  // -----------------------------
  const ROLE_OPTIONS = [
    { value: "plaintiff", label: "Plaintiff (I am filing)" },
    { value: "defendant", label: "Defendant (I am responding)" },
  ];

  // A small starter list; expand later (or load from a CA county dataset file)
  const COUNTY_OPTIONS = [
    "Alameda",
    "Contra Costa",
    "Los Angeles",
    "Orange",
    "Riverside",
    "Sacramento",
    "San Diego",
    "San Francisco",
    "San Mateo",
    "Santa Clara",
  ];

  // Placeholder court mapping (replace with config-driven jurisdiction engine later)
  const COURTS_BY_COUNTY = {
    "San Mateo": [
      {
        id: "smc-redwood-city",
        name: "San Mateo County Superior Court — Redwood City",
        address:
          "400 County Center, Redwood City, CA 94063",
      },
      {
        id: "smc-south-san-francisco",
        name: "San Mateo County Superior Court — South San Francisco",
        address:
          "1050 Mission Rd, South San Francisco, CA 94080",
      },
    ],
    "San Francisco": [
      {
        id: "sf-civic-center",
        name: "San Francisco Superior Court — Civic Center Courthouse",
        address: "400 McAllister St, San Francisco, CA 94102",
      },
    ],
    "Santa Clara": [
      {
        id: "scc-san-jose",
        name: "Santa Clara County Superior Court — Downtown Superior Court",
        address: "191 N First St, San Jose, CA 95113",
      },
    ],
  };

  const DEFAULT_COURT_FALLBACK = {
    id: "unknown",
    name: "Court (to be selected)",
    address: "",
  };

  const STEPS = useMemo(
    () => [
      { key: "role", title: "Role" },
      { key: "jurisdiction", title: "County & Court" },
      { key: "parties", title: "Parties" },
      { key: "claim", title: "Claim Details" },
      { key: "evidence", title: "Evidence Uploads" },
      { key: "review", title: "Review & Finish" },
    ],
    []
  );

  // -----------------------------
  // State
  // -----------------------------
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [error, setError] = useState("");

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

  const initializedRef = useRef(false);

  // -----------------------------
  // Draft load / init
  // -----------------------------
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      // 1) If initialCase provided, prefer it.
      if (initialCase && typeof initialCase === "object") {
        setForm((prev) => hydrateFromInitial(prev, initialCase));
        return;
      }

      // 2) Else load draft from localStorage.
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
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
  }, [initialCase, storageKey, STEPS.length]);

  // Persist draft on change (debounced-ish)
  useEffect(() => {
    try {
      const payload = {
        ...form,
        __activeStepIndex: activeStepIndex,
        __savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [form, activeStepIndex, storageKey]);

  // -----------------------------
  // Derived
  // -----------------------------
  const courtsForCounty = useMemo(() => {
    if (!form.county) return [];
    return COURTS_BY_COUNTY[form.county] || [];
  }, [form.county]);

  const isDefendant = form.role === "defendant";

  // -----------------------------
  // Handlers
  // -----------------------------
  function updateField(name, value) {
    setError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onSelectCounty(county) {
    setError("");
    setForm((prev) => ({
      ...prev,
      county,
      // reset court on county change
      courtId: "",
      courtName: "",
      courtAddress: "",
    }));
  }

  function onSelectCourt(courtId) {
    setError("");
    const found = (courtsForCounty || []).find((c) => c.id === courtId) || null;
    setForm((prev) => ({
      ...prev,
      courtId: found?.id || courtId,
      courtName: found?.name || DEFAULT_COURT_FALLBACK.name,
      courtAddress: found?.address || "",
    }));
  }

  function onAddEvidenceFiles(fileList) {
    setError("");
    const files = Array.from(fileList || []).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified,
    }));
    if (!files.length) return;
    setForm((prev) => ({
      ...prev,
      evidenceFiles: dedupeFiles([...(prev.evidenceFiles || []), ...files]),
    }));
  }

  function removeEvidenceFile(idx) {
    setForm((prev) => ({
      ...prev,
      evidenceFiles: (prev.evidenceFiles || []).filter((_, i) => i !== idx),
    }));
  }

  function saveDraftNow() {
    const payload = buildPayload(form);
    if (typeof onSaveDraft === "function") onSaveDraft(payload);
  }

  function next() {
    setError("");
    const validation = validateStep(STEPS[activeStepIndex]?.key, form);
    if (!validation.ok) {
      setError(validation.message);
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
    // Validate all steps quickly before finishing
    for (const s of STEPS) {
      const v = validateStep(s.key, form);
      if (!v.ok) {
        setError(`Fix "${s.title}": ${v.message}`);
        // jump user to step
        const idx = STEPS.findIndex((x) => x.key === s.key);
        if (idx >= 0) setActiveStepIndex(idx);
        return;
      }
    }

    const payload = buildPayload(form);
    if (typeof onComplete === "function") onComplete(payload);

    // Optional: clear draft after completion
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.h1}>Intake Wizard</div>
          <div style={styles.sub}>
            California Small Claims · {isDefendant ? "Defendant" : "Plaintiff"} Flow
          </div>
        </div>

        <div style={styles.headerActions}>
          <button type="button" style={styles.secondaryBtn} onClick={saveDraftNow}>
            Save Draft
          </button>
        </div>
      </div>

      <div style={styles.stepBar}>
        {STEPS.map((s, idx) => (
          <div
            key={s.key}
            style={{
              ...styles.stepPill,
              ...(idx === activeStepIndex ? styles.stepPillActive : {}),
              ...(idx < activeStepIndex ? styles.stepPillDone : {}),
            }}
            onClick={() => setActiveStepIndex(idx)}
            role="button"
            tabIndex={0}
          >
            <div style={styles.stepNum}>{idx + 1}</div>
            <div style={styles.stepTitle}>{s.title}</div>
          </div>
        ))}
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.card}>
        {renderStep(STEPS[activeStepIndex]?.key)}
      </div>

      <div style={styles.footer}>
        <button
          type="button"
          style={styles.secondaryBtn}
          onClick={back}
          disabled={activeStepIndex === 0}
        >
          Back
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          {activeStepIndex < STEPS.length - 1 ? (
            <button type="button" style={styles.primaryBtn} onClick={next}>
              Next
            </button>
          ) : (
            <button type="button" style={styles.primaryBtn} onClick={finish}>
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // -----------------------------
  // Step renderers
  // -----------------------------
  function renderStep(stepKey) {
    switch (stepKey) {
      case "role":
        return (
          <section>
            <div style={styles.sectionTitle}>Select your role</div>
            <div style={styles.grid2}>
              {ROLE_OPTIONS.map((opt) => (
                <label key={opt.value} style={styles.radioCard}>
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={form.role === opt.value}
                    onChange={(e) => updateField("role", e.target.value)}
                  />
                  <div style={styles.radioText}>{opt.label}</div>
                </label>
              ))}
            </div>

            {isDefendant ? (
              <div style={{ marginTop: 16 }}>
                <div style={styles.sectionTitle}>Case number (if you have it)</div>
                <input
                  style={styles.input}
                  value={form.caseNumber}
                  onChange={(e) => updateField("caseNumber", e.target.value)}
                  placeholder="e.g., 24SC012345"
                />
              </div>
            ) : null}
          </section>
        );

      case "jurisdiction":
        return (
          <section>
            <div style={styles.sectionTitle}>County</div>
            <select
              style={styles.input}
              value={form.county}
              onChange={(e) => onSelectCounty(e.target.value)}
            >
              <option value="">Select county…</option>
              {COUNTY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 16 }}>
              <div style={styles.sectionTitle}>Court</div>

              {form.county ? (
                <select
                  style={styles.input}
                  value={form.courtId}
                  onChange={(e) => onSelectCourt(e.target.value)}
                >
                  <option value="">Select court…</option>
                  {(courtsForCounty || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {courtsForCounty.length === 0 ? (
                    <option value="manual">My court isn't listed (manual)</option>
                  ) : null}
                </select>
              ) : (
                <div style={styles.helpText}>Select a county first.</div>
              )}

              {/* Manual overrides */}
              {form.courtId === "manual" || (form.county && courtsForCounty.length === 0) ? (
                <div style={{ marginTop: 12 }}>
                  <div style={styles.sectionTitle}>Court name</div>
                  <input
                    style={styles.input}
                    value={form.courtName}
                    onChange={(e) => updateField("courtName", e.target.value)}
                    placeholder="Court name"
                  />
                  <div style={{ marginTop: 10 }}>
                    <div style={styles.sectionTitle}>Court address</div>
                    <input
                      style={styles.input}
                      value={form.courtAddress}
                      onChange={(e) => updateField("courtAddress", e.target.value)}
                      placeholder="Street, City, State ZIP"
                    />
                  </div>
                </div>
              ) : null}

              {/* Locked display */}
              {form.courtName && form.courtAddress && form.courtId !== "manual" ? (
                <div style={styles.lockedBox}>
                  <div style={styles.lockedTitle}>Locked court info</div>
                  <div style={styles.lockedLine}>{form.courtName}</div>
                  <div style={styles.lockedLine}>{form.courtAddress}</div>
                </div>
              ) : null}
            </div>
          </section>
        );

      case "parties":
        return (
          <section>
            <div style={styles.sectionTitle}>Your info</div>
            <div style={styles.grid2}>
              <input
                style={styles.input}
                value={form.plaintiffName}
                onChange={(e) => updateField("plaintiffName", e.target.value)}
                placeholder={isDefendant ? "Your full name" : "Plaintiff full name"}
              />
              <input
                style={styles.input}
                value={form.plaintiffPhone}
                onChange={(e) => updateField("plaintiffPhone", e.target.value)}
                placeholder="Phone"
              />
              <input
                style={styles.input}
                value={form.plaintiffEmail}
                onChange={(e) => updateField("plaintiffEmail", e.target.value)}
                placeholder="Email"
              />
              <input
                style={styles.input}
                value={form.plaintiffAddress}
                onChange={(e) => updateField("plaintiffAddress", e.target.value)}
                placeholder="Mailing address"
              />
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={styles.sectionTitle}>
                {isDefendant ? "Plaintiff info (the person suing you)" : "Defendant info (the person/entity you’re suing)"}
              </div>
              <div style={styles.grid2}>
                <input
                  style={styles.input}
                  value={form.defendantName}
                  onChange={(e) => updateField("defendantName", e.target.value)}
                  placeholder="Full legal name / business name"
                />
                <input
                  style={styles.input}
                  value={form.defendantPhone}
                  onChange={(e) => updateField("defendantPhone", e.target.value)}
                  placeholder="Phone (if known)"
                />
                <input
                  style={styles.input}
                  value={form.defendantEmail}
                  onChange={(e) => updateField("defendantEmail", e.target.value)}
                  placeholder="Email (if known)"
                />
                <input
                  style={styles.input}
                  value={form.defendantAddress}
                  onChange={(e) => updateField("defendantAddress", e.target.value)}
                  placeholder="Address for service / business address"
                />
              </div>
            </div>
          </section>
        );

      case "claim":
        return (
          <section>
            <div style={styles.sectionTitle}>Claim basics</div>
            <div style={styles.grid2}>
              <input
                style={styles.input}
                value={form.amountDemanded}
                onChange={(e) => updateField("amountDemanded", e.target.value)}
                placeholder="Amount (e.g., 12500)"
                inputMode="decimal"
              />
              <input
                style={styles.input}
                value={form.claimType}
                onChange={(e) => updateField("claimType", e.target.value)}
                placeholder="Claim type (e.g., breach of contract, property damage)"
              />
              <input
                style={styles.input}
                value={form.incidentDate}
                onChange={(e) => updateField("incidentDate", e.target.value)}
                placeholder="Incident date (YYYY-MM-DD)"
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={styles.sectionTitle}>Narrative</div>
              <textarea
                style={{ ...styles.input, minHeight: 120 }}
                value={form.narrative}
                onChange={(e) => updateField("narrative", e.target.value)}
                placeholder={
                  isDefendant
                    ? "Explain what happened and why you dispute the claim…"
                    : "Explain what happened, what the defendant did, and what you want…"
                }
              />
              <div style={styles.helpText}>
                Keep it factual. You can upload documents in the next step.
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={styles.sectionTitle}>Hearing date/time (if already set)</div>
              <div style={styles.grid2}>
                <input
                  style={styles.input}
                  value={form.hearingDate}
                  onChange={(e) => updateField("hearingDate", e.target.value)}
                  placeholder="Hearing date (YYYY-MM-DD)"
                />
                <input
                  style={styles.input}
                  value={form.hearingTime}
                  onChange={(e) => updateField("hearingTime", e.target.value)}
                  placeholder="Hearing time (e.g., 9:00 AM)"
                />
              </div>
            </div>
          </section>
        );

      case "evidence":
        return (
          <section>
            <div style={styles.sectionTitle}>Evidence uploads</div>
            <div style={styles.helpText}>
              This step currently stores a file list only. Wire to your DocumentRepository / upload pipeline next.
            </div>

            <div style={{ marginTop: 10 }}>
              <input
                type="file"
                multiple
                onChange={(e) => onAddEvidenceFiles(e.target.files)}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              {(form.evidenceFiles || []).length === 0 ? (
                <div style={styles.helpText}>No files added yet.</div>
              ) : (
                <div style={styles.fileList}>
                  {(form.evidenceFiles || []).map((f, idx) => (
                    <div key={`${f.name}-${f.lastModified}-${idx}`} style={styles.fileRow}>
                      <div style={{ flex: 1 }}>
                        <div style={styles.fileName}>{f.name}</div>
                        <div style={styles.fileMeta}>
                          {formatBytes(f.size)} · {f.type || "unknown"}
                        </div>
                      </div>
                      <button
                        type="button"
                        style={styles.dangerBtn}
                        onClick={() => removeEvidenceFile(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case "review":
        return (
          <section>
            <div style={styles.sectionTitle}>Review</div>
            <div style={styles.helpText}>
              Confirm the key details. When you click Finish, Thoxie can generate next-step guidance + draft outputs.
            </div>

            <pre style={styles.pre}>
{JSON.stringify(buildPayload(form), null, 2)}
            </pre>
          </section>
        );

      default:
        return <div>Unknown step.</div>;
    }
  }
}

// -----------------------------
// Validation
// -----------------------------
function validateStep(stepKey, form) {
  switch (stepKey) {
    case "role":
      if (!form.role) return bad("Select a role.");
      return ok();

    case "jurisdiction":
      if (!form.county) return bad("Select a county.");
      // court may be manual; require at least a name
      if (!form.courtName && !form.courtId) return bad("Select a court.");
      if (form.courtId === "manual") {
        if (!form.courtName) return bad("Enter the court name.");
        if (!form.courtAddress) return bad("Enter the court address.");
      }
      return ok();

    case "parties":
      if (!form.plaintiffName) return bad("Enter your name.");
      if (!form.defendantName) return bad("Enter the other party’s name.");
      if (!form.defendantAddress) return bad("Enter an address for the other party (service/business).");
      return ok();

    case "claim":
      if (form.role === "plaintiff") {
        if (!form.amountDemanded) return bad("Enter the amount demanded.");
      }
      if (!form.narrative || form.narrative.trim().length < 20)
        return bad("Add a short narrative (at least ~20 characters).");
      return ok();

    case "evidence":
      return ok();

    case "review":
      return ok();

    default:
      return ok();
  }
}

function ok() {
  return { ok: true, message: "" };
}
function bad(message) {
  return { ok: false, message };
}

// -----------------------------
// Payload builder
// -----------------------------
function buildPayload(form) {
  const {
    evidenceFiles,
    amountDemanded,
    ...rest
  } = form;

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

// -----------------------------
// Helpers
// -----------------------------
function hydrateFromInitial(prev, initialCase) {
  // Only accept known keys to avoid accidental injection
  const hydrated = {
    ...prev,
    ...safePick(initialCase, Object.keys(prev)),
  };

  // If initial provides county/courtId, attempt to lock court fields
  if (hydrated.county && hydrated.courtId) {
    const list = COURTS_BY_COUNTY[hydrated.county] || [];
    const found = list.find((c) => c.id === hydrated.courtId);
    if (found) {
      hydrated.courtName = found.name;
      hydrated.courtAddress = found.address;
    }
  }
  return hydrated;
}

function safePick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function dedupeFiles(files) {
  const seen = new Set();
  const out = [];
  for (const f of files) {
    const key = `${f.name}|${f.size}|${f.lastModified}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// -----------------------------
// Inline styles (keep dependency-free)
// -----------------------------
const styles = {
  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "20px 16px 28px",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 14,
  },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: 13, opacity: 0.75 },
  headerActions: { display: "flex", gap: 10 },
  stepBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    margin: "14px 0 14px",
  },
  stepPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
    userSelect: "none",
    background: "#fff",
  },
  stepPillActive: {
    borderColor: "rgba(0,0,0,0.45)",
  },
  stepPillDone: {
    opacity: 0.75,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(0,0,0,0.2)",
    fontSize: 12,
  },
  stepTitle: { fontSize: 13, fontWeight: 600 },
  card: {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 16,
    background: "#fff",
  },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  helpText: { fontSize: 13, opacity: 0.75, marginTop: 6 },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  input: {
    width: "100%",
    border: "1px solid rgba(0,0,0,0.18)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  },
  radioCard: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: "10px 12px",
  },
  radioText: { fontSize: 14, fontWeight: 600 },
  lockedBox: {
    marginTop: 12,
    border: "1px dashed rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 12,
    background: "rgba(0,0,0,0.02)",
  },
  lockedTitle: { fontSize: 12, fontWeight: 800, opacity: 0.8, marginBottom: 6 },
  lockedLine: { fontSize: 13, opacity: 0.9 },
  fileList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: "10px 12px",
  },
  fileName: { fontSize: 14, fontWeight: 700 },
  fileMeta: { fontSize: 12, opacity: 0.7 },
  pre: {
    marginTop: 12,
    fontSize: 12,
    borderRadius: 12,
    padding: 12,
    background: "rgba(0,0,0,0.03)",
    overflowX: "auto",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "rgba(0,0,0,0.92)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBox: {
    border: "1px solid rgba(200,0,0,0.35)",
    background: "rgba(200,0,0,0.06)",
    color: "rgba(120,0,0,0.95)",
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 12,
    fontSize: 13,
    fontWeight: 650,
  },
};


