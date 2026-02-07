// path: /app/document-preview/page.js
export default function DocumentPreviewPage() {
  return (
    <main style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>Document Preview (Mock-up)</h1>

      <div style={{ maxWidth: "860px" }}>
        <div style={box}>
          <div style={{ fontWeight: 800, marginBottom: "10px" }}>
            Packet Preview
          </div>
          <div style={{ color: "#444", lineHeight: 1.7 }}>
            This is a placeholder. Next we’ll render a printable packet view with
            sections (facts, damages, exhibits list) and CA-specific forms.
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <a href="/case-dashboard" style={btn}>
            Back to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}

const box = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "14px 16px",
};

const btn = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 800,
  border: "2px solid #111",
  color: "#111",
};
