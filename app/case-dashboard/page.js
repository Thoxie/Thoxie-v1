// path: /app/case-dashboard/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { MOCK_CASE } from "../_data/mockCase";
import { MOCK_CASE_FILLED } from "../_data/mockCaseFilled";
import CaseCard from "../_components/CaseCard";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import Container from "../_components/Container";
import EmptyState from "../_components/EmptyState";

export default function CaseDashboardPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Case Dashboard (Mock-up)</h1>

        <EmptyState
          title="Start a New Case"
          message="Create a new California small claims case. This is a visual mock—no data is saved yet."
          ctaHref={ROUTES.start}
          ctaLabel="New Case"
        />

        <div style={{ marginTop: "18px" }}>
          <CaseCard title="Draft Case (Empty)" c={MOCK_CASE} />
          <CaseCard title="Draft Case (Filled Sample)" c={MOCK_CASE_FILLED} />
        </div>

        <div style={{ marginTop: "18px" }}>
          <PrimaryButton href={ROUTES.start}>Start / Continue Intake</PrimaryButton>
          <SecondaryButton href={ROUTES.preview} style={{ marginLeft: "12px" }}>
            Preview Empty
          </SecondaryButton>
          <SecondaryButton href={`${ROUTES.preview}?sample=1`} style={{ marginLeft: "12px" }}>
            Preview Filled
          </SecondaryButton>
        </div>
      </Container>

      <Footer />
    </main>
  );
}
