// Path: /app/case-dashboard/NextActionsCard.js
"use client";

import { ROUTES } from "../_config/routes";
import NextActionsList from "./_components/NextActionsList";

export default function NextActionsCard({ caseRecord, docs }) {
  const actions = computeNextActions(caseRecord, docs);

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
      <NextActionsList actions={actions} />
    </div>
  );
}

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

