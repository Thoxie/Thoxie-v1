// Path: /app/_lib/readiness/caSmallClaimsReadiness.js

/**
 * CA Small Claims Readiness Engine (v1)
 * Deterministic, server-authoritative.
 *
 * Inputs are provided by the client (caseSnapshot + documents) for now.
 * Later, replace inputs with DB lookups without changing the API surface.
 */

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function has(v) {
  return !!s(v);
}

function num(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function daysUntil(dateStr) {
  // dateStr can be "YYYY-MM-DD" or other parseable format
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function evaluateCASmallClaimsReadiness({ caseSnapshot, documents }) {
  const c = caseSnapshot && typeof caseSnapshot === "object" ? caseSnapshot : {};
  const j = c.jurisdiction && typeof c.jurisdiction === "object" ? c.jurisdiction : {};
  const docs = Array.isArray(documents) ? documents : [];

  const missingRequired = [];
  const missingRecommended = [];
  const nextActions = [];
  const jurisdictionNotes = [];

  // --- Required core intake (v1) ---
  if (!has(c.role)) missingRequired.push("Select role: Plaintiff or Defendant.");
  if (!has(c.category)) missingRequired.push("Select a case category (e.g., refund, unpaid invoice, property damage).");
  if (!has(j.county)) missingRequired.push("Select a county.");
  if (!has(j.courtName)) missingRequired.push("Select a courthouse/venue within the county.");

  // Facts summary is essential to generate coherent docs/help
  if (!has(c.factsSummary)) missingRequired.push("Add a short facts summary (2–6 sentences, chronological).");

  // Amount claimed is strongly recommended (can be derived later)
  const amt = num(c.amountClaimed);
  if (amt == null) missingRecommended.push("Enter an amount claimed (money requested).");

  // Documents: at least one piece of proof for beta usefulness
  if (docs.length === 0) missingRequired.push("Upload at least one key evidence document (receipt/contract/messages/photos).");

  // Hearing date/time (optional early, becomes important later)
  if (!has(c.hearingDate)) missingRecommended.push("Add hearing date (if assigned).");
  if (has(c.hearingDate) && !has(c.hearingTime)) missingRecommended.push("Add hearing time (if known).");

  // --- Jurisdiction notes (light, scalable) ---
  if (has(j.county)) {
    jurisdictionNotes.push(`County selected: ${s(j.county)}.`);
  }
  if (has(j.courtName)) {
    jurisdictionNotes.push(`Courthouse selected: ${s(j.courtName)}.`);
  }

  // --- Service timing reminders (deterministic, no legal advice) ---
  if (has(c.hearingDate)) {
    const du = daysUntil(c.hearingDate);
    if (du != null) {
      if (du <= 0) {
        jurisdictionNotes.push("Hearing date appears to be today or in the past. Verify the date.");
      } else {
        jurisdictionNotes.push(`Days until hearing (approx): ${du}. Service must be completed before the hearing per CA small claims rules.`);
      }
    }
  }

  // --- Score computation ---
  // Start at 100, subtract penalties for missing items. Clamp 0–100.
  let score = 100;
  score -= missingRequired.length * 18;      // heavier penalty
  score -= missingRecommended.length * 7;    // lighter penalty
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // --- Next actions (ordered) ---
  if (missingRequired.length > 0) {
    nextActions.push("Fix required items first (they block a clean filing packet).");
  }
  if (!has(j.county)) nextActions.push("Select your county (jurisdiction).");
  if (has(j.county) && !has(j.courtName)) nextActions.push("Select a courthouse/venue within the county.");
  if (!has(c.role)) nextActions.push("Select Plaintiff/Defendant role.");
  if (!has(c.category)) nextActions.push("Select your case category.");
  if (!has(c.factsSummary)) nextActions.push("Write a 2–6 sentence facts summary (chronological, names + dates + amounts).");
  if (docs.length === 0) nextActions.push("Upload your top 1–3 evidence items (receipt/contract/messages/photos).");
  if (amt == null) nextActions.push("Enter your amount claimed (money requested).");
  if (!has(c.hearingDate)) nextActions.push("If you already have a hearing date, add it (helps service timeline reminders).");

  return {
    readiness_score: score,
    missing_required: missingRequired,
    missing_recommended: missingRecommended,
    next_actions: nextActions,
    jurisdiction_notes: jurisdictionNotes,
    meta: {
      docs_count: docs.length,
      has_case_snapshot: !!caseSnapshot
    }
  };
}

