// Path: /app/case-dashboard/_components/CaseSummaryCard.js
"use client";

import TextBlock from "../../_components/TextBlock";

export default function CaseSummaryCard({ caseRecord }) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Case Summary</div>

      <div style={{ lineHeight: 1.7, color: "#333" }}>
        <div>
          <b>Plaintiff:</b> {caseRecord?.parties?.plaintiff || "—"}
        </div>
        <div>
          <b>Defendant:</b> {caseRecord?.parties?.defendant || "—"}
        </div>
        <div>
          <b>Damages:</b>{" "}
          {typeof caseRecord?.damages === "number"
            ? `$${caseRecord.damages.toLocaleString()}`
            : "—"}
        </div>
        <div>
          <b>Case Number:</b> {caseRecord?.caseNumber || "—"}
        </div>
        <div>
          <b>Hearing:</b>{" "}
          {caseRecord?.hearingDate ? caseRecord.hearingDate : "—"}{" "}
          {caseRecord?.hearingTime ? `at ${caseRecord.hearingTime}` : ""}
        </div>
      </div>

      <TextBlock
        label="Narrative (facts)"
        value={caseRecord?.facts}
        placeholder="No narrative yet. Add a short narrative in Intake Wizard."
      />
    </div>
  );
}

const card = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
};

