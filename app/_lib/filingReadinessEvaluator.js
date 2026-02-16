// Path: /app/_lib/filingReadinessEvaluator.js

/**
 * Filing Readiness Evaluator (CA Small Claims v1)
 *
 * Goals:
 * - Deterministic (no AI)
 * - Additive / backward compatible with existing saved case data
 * - Centralizes readiness signals used across UI (Next Actions, dashboards, later expansions)
 *
 * Outputs:
 * {
 *   isReady: boolean,
 *   blockingIssues: [{ key, label, detail }],
 *   recommendedIssues: [{ key, label, detail }],
 *   nextActions: [{ key, title, detail, primaryHref, primaryLabel, secondaryHref, secondaryLabel }],
 *   meta: { state, domain, county }
 * }
 */

import { resolveSmallClaimsForms } from "./formRequirementsResolver";
import { getSC100DraftData } from "./sc100Mapper";
import { ROUTES } from "../_config/routes";

export function evaluateSmallClaimsFilingReadiness(caseRecord, docs) {
  const id = safe(caseRecord?.id);

  const forms = resolveSmallClaimsForms(caseRecord || {});
  const requiredForms = Array.isArray(forms?.required) ? forms.required : [];
  const conditionalForms = Array.isArray(forms?.conditional) ? forms.conditional : [];
  const missingFormQuestions = Array.isArray(forms?.missingInfoQuestions) ? forms.missingInfoQuestions : [];

  const sc100 = getSC100DraftData(caseRecord || {});
  const missingRequired = Array.isArray(sc100?.missingRequired) ? sc100.missingRequired : [];
  const missingRecommended = Array.isArray(sc100?.missingRecommended) ? sc100.missingRecommended : [];

  const hasDocs = Array.isArray(docs) && docs.length > 0;

  const blockingIssues = [];
  const recommendedIssues = [];

  // --- Blocking: SC-100 required fields (must be complete to file SC-100)
  for (const f of missingRequired) {
    blockingIssues.push({
      key: `sc100_required:${safe(f.key) || safe(f.label)}`,
      label: f.label || "Missing required SC-100 field",
      detail: "Required for SC-100 filing.",
    });
  }

  // --- Blocking: missing info needed to finalize forms (service method, DBA, etc.)
  for (let i = 0; i < missingFormQuestions.length; i++) {
    const q = safe(missingFormQuestions[i]);
    if (!q) continue;
    blockingIssues.push({
      key: `forms_missinginfo:${i}`,
      label: q,
      detail: "Needed to finalize the forms checklist.",
    });
  }

  // --- Recommended: SC-100 recommended fields
  for (const f of missingRecommended) {
    recommendedIssues.push({
      key: `sc100_recommended:${safe(f.key) || safe(f.label)}`,
      label: f.label || "Recommended SC-100 field",
      detail: "Strongly recommended for completeness.",
    });
  }

  // --- Recommended: conditional forms (not necessarily required; depends on answers)
  for (const f of conditionalForms) {
    const code = safe(f?.code) || "FORM";
    const reason = safe(f?.reason) || "Depends on your answers.";
    recommendedIssues.push({
      key: `conditional_form:${code}`,
      label: `${code}: ${safe(f?.title) || code}`,
      detail: reason,
    });
  }

  // --- Evidence/documents are practically required for “file-ready”
  if (!hasDocs) {
    recommendedIssues.push({
      key: "evidence:none",
      label: "Upload at least 1–2 evidence documents",
      detail: "Not required for SC-100, but strongly recommended for a file-ready packet.",
    });
  }

  // --- Next Actions (prioritized)
  const nextActions = [];

  // 1) If missing SC-100 required fields or missing form questions, push user to Intake
  if (blockingIssues.length > 0) {
    nextActions.push({
      key: "complete_intake_for_filing",
      title: "Complete missing filing inputs",
      detail:
        "Fill the missing SC-100 required fields and answer the form checklist questions so Thoxie can finalize your filing packet.",
      primaryHref: `${ROUTES.intake}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Edit Intake",
      secondaryHref: `${ROUTES.dashboard}?caseId=${encodeURIComponent(id)}`,
      secondaryLabel: "Back to Hub",
    });
  }

  // 2) Evidence upload action (if none)
  if (!hasDocs) {
    nextActions.push({
      key: "upload_evidence",
      title: "Upload evidence (recommended)",
      detail: "Add PDFs/photos/text files (contracts, invoices, texts, photos). Even 1–2 exhibits is enough for beta.",
      primaryHref: `${ROUTES.documents}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Upload Docs",
      secondaryHref: `${ROUTES.dashboard}?caseId=${encodeURIComponent(id)}`,
      secondaryLabel: "Back to Hub",
    });
  }

  // 3) If forms are resolved but URLs exist, suggest reviewing filing guidance
  const hasAnyForms = requiredForms.length > 0 || conditionalForms.length > 0;
  if (hasAnyForms) {
    nextActions.push({
      key: "review_filing_guidance",
      title: "Review filing guidance for this court",
      detail: "Confirm where and how to file, fees, and service steps for your courthouse.",
      primaryHref: `${ROUTES.filingGuidance}?caseId=${encodeURIComponent(id)}`,
      primaryLabel: "Filing Guidance",
      secondaryHref: `${ROUTES.dashboard}?caseId=${encodeURIComponent(id)}`,
      secondaryLabel: "Back to Hub",
    });
  }

  // If we added the “complete intake” action, keep others but avoid overwhelming.
  // Hard cap: 3 actions (deterministic ordering)
  const cappedActions = nextActions.slice(0, 3);

  const isReady =
    blockingIssues.length === 0 &&
    // We consider “file-ready” to mean: SC-100 required fields complete + forms checklist not gated by unknowns
    // Evidence is recommended but not a hard blocker.
    true;

  return {
    isReady,
    blockingIssues,
    recommendedIssues,
    nextActions: cappedActions,
    meta: {
      state: safe(forms?.meta?.state) || "CA",
      domain: safe(forms?.meta?.domain) || "small_claims",
      county: safe(forms?.meta?.county) || safe(caseRecord?.jurisdiction?.county),
    },
  };
}

function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return s.trim();
}

