// path: /app/start/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";

export default function StartPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif", flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Start (Mock Intake)</h1>

        <p style={{ maxWidth: "740px" }}>
          California-only mock intake. Use the preview links below to view an empty draft
          or a filled sample packet.
        </p>

        <div style={{ marginTop: "10px" }}>
          <a href={ROUTES.preview} style={btnSecondary}>
            Preview Empty Draft
          </a>

          <a href={`${ROUTES.preview}?sample=1`} style={{ ...btnPrimary, marginLeft: "12px" }}>
            Preview Filled Sample
          </a>
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


