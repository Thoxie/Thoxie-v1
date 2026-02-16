// Path: /app/case-dashboard/NextActionsCard.js
"use client";

import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import { ROUTES } from "../_config/routes";
import { resolveSmallClaimsForms } from "../_lib/formRequirementsResolver";
import { getSC100DraftData } from "../_lib/sc100Mapper";

export default function NextActionsCard({ caseRecord, docs }) {
  // Legacy actions (verified to exist in repo; must not be removed)
  const legacyActions = computeNextActions(caseRecord, docs);

  // New evaluator actions (additive)
  const evaluatorActions = computeEvaluatorActions(caseRecord, docs);

  // Merge + de-dupe by key. Legacy first to preserve existing priorities.
  const actions = mergeActions(legacyActions, evaluatorActions);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Next Actions</div>

      {actions.length === 0 ? (
        <div style={{ color: "#2e7d32", fontWeight: 900 }}>
          ✅ All core beta items look complete.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {actions.map((a) => (
            <div
              key={a.key}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900 }}>{a.title}</div>
                <div style={{ color: "#666", marginTop: 2, lineHeight: 1.5 }}>
                  {a.detail}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                {a.primaryHref ? (
                  <PrimaryButton href={a.primaryHref}>{a.primaryLabel}</PrimaryButton>
                ) : null}
                {a.secondaryHref ? (
                  <SecondaryButton href={a.secondaryHref}>{a.secondaryLabel}</SecondaryButton>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Additive evaluator-driven actions:
 * - SC-100 missing required fields (blocker)
 * - forms resolver missing info questions (blocker to finalize forms checklist)
 * - conditional forms awareness (recommended)
 *
 * NOTE: We do NOT change/replace existing legacy checks; we only add.
 */
function computeEvaluatorActions(caseRecord, docs) {
  const out = [];
  const id = safe(caseRecord?.id);

  // --- Forms resolver (required/conditional + missing info questions)
  const forms = resolveSmallClaimsForms(caseRecord || {});
  const missingInfoQuestions = Array.isArray(forms?.missingInfoQuestions) ? forms.missingInfoQuestions : [];
  const conditional = Array.isArray(forms?.conditional) ? forms.conditional : [];

  // If forms engine needs info, push user to intake to answer the gating questions.
  if (missingInfoQuestions.length > 0) {
    out.push({
      key: "forms_missing_info",
      title: "Answer form checklist questions",
      detail:
        "Thoxie needs a few answers (e.g., service method/party details) to finalize the statewide forms checklist.",
      primaryHref: `${ROUTES.intake}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Edit Intake",
      secondaryHref: `${ROUTES.filingGuidance}?caseId=${encodeURIComponent(id)}`,
      secondaryLabel: "Filing Guidance",
    });
  }

  // If conditional forms are triggered, surface a “review forms checklist” action (non-blocking).
  if (conditional.length > 0) {
    out.push({
      key: "review_conditional_forms",
      title: "Review conditional forms",
      detail: "Some additional forms may apply based on your case details. Confirm your checklist before filing.",
      primaryHref: `${ROUTES.dashboard}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Back to Hub",
      secondaryHref: `${ROUTES.filingGuidance}?caseId=${encodeURIComponent(id)}`,
      secondaryLabel: "Filing Guidance",
    });
  }

  // --- SC-100 readiness (missing required fields are the strongest filing blocker)
  const sc100 = getSC100DraftData(caseRecord || {});
  const missingRequired = Array.isArray(sc100?.missingRequired) ? sc100.missingRequired : [];

  if (missingRequired.length > 0) {
    out.push({
      key: "sc100_missing_required",
      title: "Complete SC-100 required fields",
      detail: "Some SC-100 required fields are missing. Fill them to generate a file-ready plaintiff packet.",
      primaryHref: `${ROUTES.intake}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Edit Intake",
      secondaryHref: `${ROUTES.dashboard}?caseId=${encodeURIComponent(id)}`,
      secondaryLabel: "Back to Hub",
    });
  }

  // Evidence is already handled by legacy logic (docs), so we don't duplicate it here.

  return out;
}

function mergeActions(a = [], b = []) {
  const out = [];
  const seen = new Set();

  for (const item of [...a, ...b]) {
    const key = safe(item?.key);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  // Avoid noise; keep the card readable without redesign.
  return out.slice(0, 8);
}

/**
 * VERIFIED legacy behavior from repo (do not remove).
 * (Kept intact; only moved below new helpers.)
 */
function computeNextActions(caseRecord, docs) {
  const out = [];

  const id = caseRecord?.id || "";
  const county = caseRecord?.jurisdiction?.county || "";
  const court = caseRecord?.jurisdiction?.courtName || "";
  const plaintiff = caseRecord?.parties?.plaintiff || "";
  const defendant = caseRecord?.parties?.defendant || "";
  const damages = typeof caseRecord?.damages === "number" ? caseRecord.damages : null;
  const facts = (caseRecord?.facts || "").trim();
  const hearingDate = (caseRecord?.hearingDate || "").trim();

  if (!county || !court) {
    out.push({
      key: "jurisdiction",
      title: "Confirm court selection",
      detail: "Select County and Court so filing guidance matches the right courthouse.",
      primaryHref: `${ROUTES.intake}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Edit Intake",
      secondaryHref: `${ROUTES.filingGuidance}?caseId=${encodeURIComponent(id)}`,
      secondaryLabel: "Filing Guidance",
    });
  }

  if (!plaintiff || !defendant) {
    out.push({
      key: "parties",
      title: "Complete parties",
      detail: "Add plaintiff and defendant names (minimum).",
      primaryHref: `${ROUTES.intake}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Edit Intake",
    });
  }

  if (!damages || damages <= 0) {
    out.push({
      key: "damages",
      title: "Set damages amount",
      detail: "Add the dollar amount you’re asking for (or responding to).",
      primaryHref: `${ROUTES.intake}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Edit Intake",
    });
  }

  if (!facts) {
    out.push({
      key: "facts",
      title: "Add a short narrative",
      detail: "Write key facts in chronological order (used later for drafting).",
      primaryHref: `${ROUTES.intake}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Edit Intake",
    });
  }

  if (!Array.isArray(docs) || docs.length === 0) {
    out.push({
      key: "docs",
      title: "Upload evidence",
      detail: "Add PDFs/photos/text files for this case (even 1–2 exhibits is enough for beta).",
      primaryHref: `${ROUTES.documents}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Upload Docs",
    });
  }

  if (!hearingDate) {
    out.push({
      key: "hearing",
      title: "Add hearing date (if known)",
      detail: "If you have a notice, record hearing date/time in Key Dates.",
      primaryHref: `${ROUTES.keyDates}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Key Dates",
    });
  }

  return out;
}

function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return s.trim();
}


