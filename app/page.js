// path: /app/page.js
import Header from "./_components/Header";
import Footer from "./_components/Footer";
import StateBadge from "./_components/StateBadge";
import Container from "./_components/Container";
import PrimaryButton from "./_components/PrimaryButton";
import SecondaryButton from "./_components/SecondaryButton";
import { ROUTES } from "./_config/routes";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <StateBadge />

        <h1 style={{ margin: "12px 0 0 0", fontSize: "30px" }}>
          Small Claims Assistant
        </h1>

        <p style={{ marginTop: "10px", maxWidth: "720px", fontSize: "16px", lineHeight: 1.7 }}>
          California-only mock-up. Next we’ll add real intake forms, saved drafts, and a printable packet.
        </p>

        <div style={{ marginTop: "16px" }}>
          <PrimaryButton href={ROUTES.start}>Start</PrimaryButton>
          <SecondaryButton href={ROUTES.howItWorks} style={{ marginLeft: "12px" }}>
            How It Works
          </SecondaryButton>
          <SecondaryButton href={ROUTES.dashboard} style={{ marginLeft: "12px" }}>
            Dashboard
          </SecondaryButton>
        </div>
      </Container>

      <Footer />
    </main>
  );
}
