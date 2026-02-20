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

        {/* HERO HEADLINE — smaller style */}
        <h1
          style={{
            margin: "14px 0 0 0",
            fontSize: "56px",
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#111",
            maxWidth: "980px",
          }}
        >
          <span style={{ display: "block" }}>Win in Small Claims Court.</span>
          <span style={{ display: "block" }}>Don’t lose because</span>
          <span style={{ display: "block" }}>you were unprepared.</span>
        </h1>

        {/* SUPPORTING TEXT — forced to two lines */}
        <p
          style={{
            marginTop: "18px",
            maxWidth: "980px",
            fontSize: "20px",
            lineHeight: 1.6,
            color: "#333",
            fontWeight: 400,
          }}
        >
          THOXIE gives you speed, structure, and leverage — so you walk
          <br />
          in knowing more, prepared faster, and in control.
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

        {/* EXISTING BUTTONS — below text */}
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
