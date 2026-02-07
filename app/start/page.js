// path: /app/start/page.js
export default function StartPage() {
  return (
    <main style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>Start (Mock-up)</h1>

      <div style={{ maxWidth: "720px", lineHeight: 1.6 }}>
        <p>
          California-only (v1). This is a visual placeholder for the intake flow.
        </p>

        <div style={card}>
          <h2 style={h2}>Step 1: Case basics</h2>
          <p style={p}>Claim amount, county, plaintiff/defendant type.</p>
        </div>

        <div style={card}>
          <h2 style={h2}>Step 2: What happened?</h2>
          <p style={p}>Short narrative + timeline bullets.</p>
        </div>

        <div style={card}>
          <h2 style={h2}>Step 3: Evidence</h2>
          <p style={p}>Upload docs (later). For now, we’ll show placeholders.</p>
        </div>

        <div style={{ marginTop: "18px" }}>
          <a href="/" style={btn}>
            Back to Home
          </a>
          <a href="/case-dashboard" style={{ ...btn, marginLeft: "12px" }}>
            Go to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}

const card = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "14px 16px",
  marginTop: "12px",
};

const h2 = { margin: 0, fontSize: "18px" };
const p = { margin: "6px 0 0 0", color: "#333" };

const btn = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 700,
  border: "2px solid #111",
  color: "#111",
};

