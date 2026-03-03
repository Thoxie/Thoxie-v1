// Path: /app/case-dashboard/_components/CaseIdentityHeader.js
"use client";

function safe(v) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function formatLine(label, value, fallback = "—") {
  const v = safe(value);
  return { label, value: v ? v : fallback };
}

export default function CaseIdentityHeader({ caseRecord }) {
  const plaintiff = safe(caseRecord?.parties?.plaintiff);
  const defendant = safe(caseRecord?.parties?.defendant);

  const caseNumber = safe(caseRecord?.caseNumber);
  const county = safe(caseRecord?.jurisdiction?.county);
  const courtName = safe(caseRecord?.jurisdiction?.courtName);
  const department = safe(caseRecord?.jurisdiction?.department);

  const hearingDate = safe(caseRecord?.hearingDate);
  const hearingTime = safe(caseRecord?.hearingTime);

  const title =
    plaintiff || defendant
      ? `${plaintiff || "(Plaintiff not set)"} v. ${defendant || "(Defendant not set)"}`
      : "Add Plaintiff and Defendant in Start / Edit Intake";

  const meta = [
    formatLine("Case Number", caseNumber, "Not assigned yet"),
    formatLine("County", county, "Not selected yet"),
    formatLine("Court", courtName, "Not selected yet"),
    formatLine("Department", department, "—"),
    formatLine(
      "Hearing",
      hearingDate ? `${hearingDate}${hearingTime ? ` at ${hearingTime}` : ""}` : "",
      "—"
    ),
  ];

  return (
    <div style={wrap}>
      <div style={titleStyle}>{title}</div>

      <div style={metaGrid}>
        {meta.map((m) => (
          <div key={m.label} style={metaItem}>
            <div style={metaLabel}>{m.label}</div>
            <div style={metaValue}>{m.value}</div>
          </div>
        ))}
      </div>

      {(!plaintiff || !defendant || !county || !courtName) && (
        <div style={hint}>
          Tip: Use <b>Start / Edit Intake</b> to complete Plaintiff, Defendant, County, and Court so this header is always clear.
        </div>
      )}
    </div>
  );
}

const wrap = {
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 16,
  background: "#fff",
  marginTop: 10,
};

const titleStyle = {
  fontWeight: 1000,
  fontSize: 22,
  lineHeight: 1.2,
};

const metaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginTop: 12,
};

const metaItem = {
  border: "1px solid #f0f0f0",
  borderRadius: 12,
  padding: 10,
  background: "#fafafa",
};

const metaLabel = {
  fontSize: 12,
  fontWeight: 900,
  color: "#666",
};

const metaValue = {
  marginTop: 4,
  fontSize: 13,
  fontWeight: 900,
  color: "#111",
};

const hint = {
  marginTop: 10,
  fontSize: 12,
  color: "#555",
};
