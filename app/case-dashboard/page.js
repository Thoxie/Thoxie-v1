// path: /app/case-dashboard/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { MOCK_CASE } from "../_data/mockCase";
import { MOCK_CASE_FILLED } from "../_data/mockCaseFilled";
import CaseCard from "../_components/CaseCard";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";

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
            <PrimaryButton href={ROUTES.start}>Start / Continue Intake</PrimaryButton>

            <SecondaryButton href={ROUTES.preview} style={{ marginLeft: "12px" }}>
              Preview Empty
            </SecondaryButton>

            <SecondaryButton href={`${ROUTES.preview}?sample=1`} style={{ marginLeft: "12px" }}>
              Preview Filled
            </SecondaryButton>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
