// path: /app/case-dashboard/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { MOCK_CASE } from "../_data/mockCase";
import { MOCK_CASE_FILLED } from "../_data/mockCaseFilled";
import CaseCard from "../_components/CaseCard";

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
              Preview Empty
            </a>

            <a href={`${ROUTES.preview}?sample=1`} style={{ ...btnSecondary, marginLeft: "12px" }}>
              Preview Filled
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

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




