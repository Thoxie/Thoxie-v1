// path: /app/start/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";

export default function StartPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Start (Mock Intake)</PageTitle>

        <p style={{ maxWidth: "740px", lineHeight: 1.7 }}>
          California-only mock intake. Use the preview links below to view an empty draft
          or a filled sample packet.
        </p>

        <div style={{ marginTop: "10px" }}>
          <SecondaryButton href={ROUTES.preview}>Preview Empty Draft</SecondaryButton>

          <PrimaryButton href={`${ROUTES.preview}?sample=1`} style={{ marginLeft: "12px" }}>
            Preview Filled Sample
          </PrimaryButton>
        </div>

        <div style={{ marginTop: "18px" }}>
          <PrimaryButton href={ROUTES.dashboard}>Go to Dashboard</PrimaryButton>

          <SecondaryButton href={ROUTES.home} style={{ marginLeft: "12px" }}>
            Home
          </SecondaryButton>
        </div>
      </Container>

      <Footer />
    </main>
  );
}
