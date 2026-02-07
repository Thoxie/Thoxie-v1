// path: /app/_components/CaseCard.js
export default function CaseCard({ title, c }) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div style={{ color: "#444", marginTop: "8px", lineHeight: 1.7 }}>
        Status: <strong>{c.status}</strong>
        <br />
        County: <strong>{c.county || "(not set)"}</strong>
        <br />
        Claim Amount: <strong>{c.claimAmount || "(not set)"}</strong>
        <br />
        Plaintiff: <strong>{c.parties?.plaintiff || "(not set)"}</strong>
        <br />
        Defendant: <strong>{c.parties?.defendant || "(not set)"}</strong>
      </div>
    </div>
  );
}

const card = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "14px 16px",
  marginTop: "12px",
  background: "#fff",
  maxWidth: "920px",
};

