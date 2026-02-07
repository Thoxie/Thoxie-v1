// path: /app/start/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { MOCK_CASE } from "../_data/mockCase";
import { MOCK_CASE_FILLED } from "../_data/mockCaseFilled";

export default function StartPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif", flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Start (Mock Intake)</h1>

        <p style={{ maxWidth: "740px" }}>
          California-only mock intake. Demo tip: use the filled sample so Preview shows realistic content.
        </p>

        <div style={{ marginTop: "10px" }}>
          <a href={ROUTES.preview} style={btnSecondary}>
            Preview Empty Draft
          </a>
          <a href={ROUTES.preview} style={{ ...btnPrimary, marginLeft: "12px" }}>
            Preview Filled Sample
          </a>
        </div>

        <div style={{ marginTop: "18px" }}>
          <CaseBlock title="Draft (Empty)" c={MOCK_CASE} />
          <CaseBlock title="Draft (Filled Sample)" c={MOCK_CASE_FILLED} />
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

function CaseBlock({ title, c }) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 900 }}>{title}</div>

      <div style={grid}>
        <Field label="County (CA)" value={c.county} placeholder="e.g., San Mateo" />
        <Field label="Claim Amount (USD)" value={c.claimAmount} placeholder="e.g., 2500" />
        <Field label="Plaintiff" value={c.parties.plaintiff} placeholder="Your name" />
        <Field label="Defendant" value={c.parties.defendant} placeholder="Other party" />
      </div>

      <div style={{ marginTop: "12px" }}>
        <label style={labelStyle}>Facts</label>
        <div style={textareaMock}>{c.facts || "Placeholder…"}</div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <label style={labelStyle}>Damages</label>
        <div style={textareaMock}>{c.damages || "Placeholder…"}</div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <label style={labelStyle}>Exhibits</label>
        <div style={textareaMock}>
          {c.exhibits?.length ? c.exhibits.join(", ") : "None yet (placeholder)."}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, placeholder }) {
  return (
    <div style={fieldBox}>
      <div style={labelStyle}>{label}</div>
      <div style={inputMock}>{value || placeholder}</div>
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

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  marginTop: "12px",
  maxWidth: "820px",
};

const fieldBox = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "12px 14px",
  background: "#fafafa",
};

const labelStyle = { fontSize: "13px", fontWeight: 800, marginBottom: "6px" };

const inputMock = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px 12px",
  color: "#555",
  background: "#ffffff",
};

const textareaMock = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "12px",
  color: "#555",
  background: "#ffffff",
  minHeight: "70px",
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

