 // path: /app/document-preview/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { getCaseFromQuery } from "../_data/getCase";
import CasePacket from "../_components/CasePacket";
import SecondaryButton from "../_components/SecondaryButton";

export default function DocumentPreviewPage({ searchParams }) {
  const c = getCaseFromQuery(searchParams);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif", flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Document Preview (Mock Packet)</h1>

        <CasePacket c={c} />

        <div style={{ marginTop: "18px" }}>
          <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>

          <SecondaryButton href={ROUTES.start} style={{ marginLeft: "12px" }}>
            Edit Intake
          </SecondaryButton>
        </div>
      </section>

      <Footer />
    </main>
  );
}
