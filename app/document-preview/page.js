// path: /app/document-preview/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { getCaseFromQuery } from "../_data/getCase";
import CasePacket from "../_components/CasePacket";

export default function DocumentPreviewPage({ searchParams }) {
  const c = getCaseFromQuery(searchParams);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif", flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Document Preview (Mock Packet)</h1>

        <CasePacket c={c} />

        <div style={{ marginTop: "18px" }}>
          <a href={ROUTES.dashboard} style={btn}>
            Back to Dashboard
          </a>
          <a href={ROUTES.start} style={{ ...btn, marginLeft: "12px" }}>
            Edit Intake
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}

const btn = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 800,
  border: "2px solid #111",
  color: "#111",
};


