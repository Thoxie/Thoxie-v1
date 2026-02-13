// Path: /app/case-dashboard/_components/HubHeader.js
"use client";

import PrimaryButton from "../../_components/PrimaryButton";
import SecondaryButton from "../../_components/SecondaryButton";

export default function HubHeader({
  title = "Case Hub",
  subtitle = "",
  caseId = "",
  docCount = 0,
  routes,
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>{title}</div>

      {subtitle ? (
        <div style={{ fontWeight: 900, color: "#555", marginTop: "-2px" }}>{subtitle}</div>
      ) : null}

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <PrimaryButton href={`${routes.documents}?caseId=${encodeURIComponent(caseId)}`}>
          Documents ({docCount})
        </PrimaryButton>

        <SecondaryButton href={`${routes.intake}?caseId=${encodeURIComponent(caseId)}`}>
          Edit Intake
        </SecondaryButton>

        <SecondaryButton href={`${routes.filingGuidance}?caseId=${encodeURIComponent(caseId)}`}>
          Filing Guidance
        </SecondaryButton>

        <SecondaryButton href={`${routes.keyDates}?caseId=${encodeURIComponent(caseId)}`}>
          Key Dates
        </SecondaryButton>

        <SecondaryButton href={routes.dashboard}>Back to Case List</SecondaryButton>
      </div>
    </div>
  );
}

