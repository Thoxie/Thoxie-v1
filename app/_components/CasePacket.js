// path: /app/_components/CasePacket.js
export default function CasePacket({ c }) {
  return (
    <div style={box}>
      <div style={title}>California Small Claims — Draft Packet</div>

      <Row label="Status" value={c.status} />
      <Row label="County" value={c.county || "(not set)"} />
      <Row label="Claim Amount" value={c.claimAmount || "(not set)"} />

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "14px 0" }} />

      <div style={sectionTitle}>Parties</div>
      <div style={paragraph}>
        Plaintiff: <strong>{c.parties?.plaintiff || "(not set)"}</strong>
        <br />
        Defendant: <strong>{c.parties?.defendant || "(not set)"}</strong>
      </div>

      <div style={sectionTitle}>Facts</div>
      <div style={paragraph}>{c.facts || "Placeholder…"}</div>

      <div style={sectionTitle}>Damages</div>
      <div style={paragraph}>{c.damages || "Placeholder…"}</div>

      <div style={sectionTitle}>Exhibits</div>
      <div style={paragraph}>
        {c.exhibits?.length ? c.exhibits.join(", ") : "None yet (placeholder)."}
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

const box = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "16px 18px",
  background: "#fff",
  maxWidth: "920px",
};

const title = { fontWeight: 900, fontSize: "16px", marginBottom: "10px" };

const row = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: "12px",
  padding: "6px 0",
};

const labelStyle = { color: "#555", fontWeight: 800, fontSize: "13px" };
const valueStyle = { color: "#111", fontWeight: 700 };

const sectionTitle = { marginTop: "14px", fontWeight: 900, fontSize: "14px" };
const paragraph = { marginTop: "6px", lineHeight: 1.7, color: "#222" };

