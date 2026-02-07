// path: /app/start/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { MOCK_CASE } from "../_data/mockCase";

export default function StartPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif", flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Start (Mock Intake)</h1>

        <p style={{ maxWidth: "740px" }}>
          California-only mock intake. Next step: save these fields and reflect them
          in Dashboard + Preview.
        </p>

        <div style={grid}>
          <Field label="County (CA)" placeholder="e.g., San Mateo" value={MOCK_CASE.county} />
          <Field label="Claim Amount (USD)" placeholder="e.g., 2500" value={MOCK_CASE.claimAmount} />
          <Field label="Plaintiff" placeholder="Your name" value={MOCK_CASE.parties.plaintiff} />
          <Field label="Defendant" placeholder="Other party" value={MOCK_CASE.parties.defendant} />
        </div>

        <div style={{ marginTop: "12px" }}>
          <label style={labelStyle}>Facts (1–2 paragraphs)</label>
          <div style={textareaMock}>{MOCK_CASE.facts || "Placeholder…"}</div>
        </div>

        <div style={{ marginTop: "12px" }}>
          <label style={labelStyle}>Damages</label>
          <div style={textareaMock}>{MOCK_CASE.damages || "Placeholder…"}</div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <a href={ROUTES.dashboard} style={btnPrimary}>
            Go to Dashboard
          </a>
          <a href={ROUTES.home} style={{ ...btnSecondary, marginLeft: "12px" }}>
            Home
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Field({ label, placeholder, value }) {
  return (
    <div style={fieldBox}>
      <div style={labelStyle}>{label}</div>
      <div style={inputMock}>{value || placeholder}</div>
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  maxWidth: "740px",
};

const fieldBox = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "12px 14px",
};

const labelStyle = { fontSize: "13px", fontWeight: 800, marginBottom: "6px" };

const inputMock = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px 12px",
  color: "#555",
  background: "#fafafa",
};

const textareaMock = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "12px",
  color: "#555",
  background: "#fafafa",
  minHeight: "90px",
  maxWidth: "740px",
  lineHeight: 1.6,
};

const btnPrimary = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 800,
  background: "#111",
  color: "#fff",
};

const btnSecondary = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 800,
  border: "2px solid #111",
  color: "#111",
};

