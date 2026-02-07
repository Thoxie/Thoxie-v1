// path: /app/case-dashboard/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { MOCK_CASE } from "../_data/mockCase";
import { MOCK_CASE_FILLED } from "../_data/mockCaseFilled";

export default function CaseDashboardPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif", flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Case Dashboard (Mock-up)</h1>

        <div style={{ maxWidth: "920px" }}>
          <CaseCard title="Draft Case (Empty)" c={MOCK_CASE} />
          <CaseCard title="Draft Case (Filled Sample)" c={MOCK_CASE_FILLED} />

          <div style={{ marginTop: "18px" }}>
            <a href={ROUTES.start} style={btnPrimary}>
              Start / Continue Intake
            </a>
            <a href={ROUTES.preview} style={{ ...btnSecondary, marginLeft: "12px" }}>
              Open Preview
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function CaseCard({ title, c }) {
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



