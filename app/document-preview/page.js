// path: /app/document-preview/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { getCaseFromQuery } from "../_data/getCase";
import CasePacket from "../_components/CasePacket";
import SecondaryButton from "../_components/SecondaryButton";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import PrimaryButton from "../_components/PrimaryButton";

export default function DocumentPreviewPage({ searchParams }) {
  const c = getCaseFromQuery(searchParams);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <PageTitle>Document Preview (Mock Packet)</PageTitle>
          <PrimaryButton href="#" style={{ height: "fit-content" }}>
            Print (Mock)
          </PrimaryButton>
        </div>

        <CasePacket c={c} />

        <div style={{ marginTop: "18px" }}>
          <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>

          <SecondaryButton href={ROUTES.start} style={{ marginLeft: "12px" }}>
            Edit Intake
          </SecondaryButton>
        </div>
      </Container>

      <Footer />
    </main>
  );
}
