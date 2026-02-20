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

        {/* HERO TEXT (recreated) */}
        <h1
          style={{
            margin: "14px 0 0 0",
            fontSize: "76px",
            fontWeight: 900,
            lineHeight: 0.92,
            letterSpacing: "-0.02em",
            color: "#111",
            maxWidth: "980px",
          }}
        >
          <span style={{ display: "block" }}>Win your case.</span>
          <span style={{ display: "block" }}>Don’t lose because</span>
          <span style={{ display: "block" }}>you were unprepared.</span>
        </h1>

        <p
          style={{
            marginTop: "18px",
            maxWidth: "980px",
            fontSize: "22px",
            lineHeight: 1.55,
            color: "#111",
          }}
        >
          THOXIE gives you speed, structure, and leverage — so you walk in knowing more,
          prepared faster, and in control.
        </p>

        <p
          style={{
            marginTop: "14px",
            maxWidth: "980px",
            fontSize: "18px",
            lineHeight: 1.5,
            color: "#111",
            fontWeight: 600,
          }}
        >
          More knowledge in minutes. Less money burned. Better decisions.
        </p>

        {/* EXISTING BUTTONS (moved below hero text) */}
        <div style={{ marginTop: "22px" }}>
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
