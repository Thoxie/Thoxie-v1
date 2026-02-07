// path: /app/how-it-works/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";

export default function HowItWorksPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>How It Works (Mock-up)</PageTitle>

        <ol style={{ lineHeight: 1.8, maxWidth: "640px" }}>
          <li>California-only in v1.</li>
          <li>Answer guided intake questions.</li>
          <li>Upload evidence and documents.</li>
          <li>Preview a draft packet and checklist.</li>
        </ol>

        <div style={{ marginTop: "16px" }}>
          <PrimaryButton href={ROUTES.start}>Start a Case</PrimaryButton>
          <SecondaryButton href={ROUTES.dashboard} style={{ marginLeft: "12px" }}>
            View Dashboard
          </SecondaryButton>
        </div>
      </Container>

      <Footer />
    </main>
  );
}
