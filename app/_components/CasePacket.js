// Path: /app/_components/CasePacket.js
export default function CasePacket({ c }) {
  const county = c?.jurisdiction?.county || "(not set)";
  const courtName = c?.jurisdiction?.courtName || "(not set)";
  const courtAddress = c?.jurisdiction?.courtAddress || "(not set)";
  const roleLabel = c?.role === "defendant" ? "Defendant" : "Plaintiff";

  return (
    <div style={box}>
      <div style={title}>California Small Claims — Draft Packet</div>

      <Row label="Status" value={c?.status || "draft"} />
      <Row label="Role" value={roleLabel} />
      <Row label="Category" value={c?.category || "(not set)"} />
      <Row label="County" value={county} />
      <Row label="Court" value={courtName} />
      <Row label="Court Address" value={courtAddress} />
      <Row label="Damages" value={formatMoney(c?.damages)} />

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "14px 0" }} />

      <div style={sectionTitle}>Parties</div>
      <div style={paragraph}>
        Plaintiff: <strong>{c?.parties?.plaintiff || "(not set)"}</strong>
        <br />
        Defendant: <strong>{c?.parties?.defendant || "(not set)"}</strong>
      </div>

      <div style={sectionTitle}>Facts (Draft Narrative)</div>
      <div style={paragraph}>{c?.facts?.trim() ? c.facts : "Placeholder… (no facts entered yet)"}</div>

      <div style={sectionTitle}>Exhibits</div>
      <div style={paragraph}>None yet (placeholder — uploads/RAG comes next).</div>

      <div style={{ marginTop: "12px", fontSize: "12px", color: "#666", lineHeight: 1.5 }}>
        This packet is a draft generated for preparation and organization. It is not legal advice and is not filed with any court.
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={row}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

function formatMoney(n) {
  if (n === null || n === undefined) return "(not set)";
  const num = Number(n);
  if (Number.isNaN(num)) return "(invalid)";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const box = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "16px 18px",
  background: "#fff",
  maxWidth: "920px"
};

const title = { fontWeight: 900, fontSize: "16px", marginBottom: "10px" };

const row = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: "12px",
  padding: "6px 0"
};

const labelStyle = { color: "#555", fontWeight: 800, fontSize: "13px" };
const valueStyle = { color: "#111", fontWeight: 700 };

const sectionTitle = { marginTop: "14px", fontWeight: 900, fontSize: "14px" };
const paragraph = { marginTop: "6px", lineHeight: 1.7, color: "#222" };
