// path: /app/start/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import Field from "../_components/Field";
import TextBlock from "../_components/TextBlock";
import { getCaseFromQuery } from "../_data/getCase";

export default function StartPage({ searchParams }) {
  const c = getCaseFromQuery(searchParams);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Start (Mock Intake)</PageTitle>

        <p style={{ maxWidth: "820px", lineHeight: 1.7 }}>
          This is a visual intake mock. Use <strong>?sample=1</strong> to view the filled sample.
        </p>

        <div style={{ marginTop: "10px" }}>
          <SecondaryButton href={ROUTES.start}>Empty</SecondaryButton>

          <PrimaryButton href={`${ROUTES.start}?sample=1`} style={{ marginLeft: "12px" }}>
            Filled Sample
          </PrimaryButton>
        </div>

        <Field label="County (CA)" value={c.county} placeholder="e.g., San Mateo" />
        <Field label="Claim Amount (USD)" value={c.claimAmount} placeholder="e.g., 2500" />
        <Field label="Plaintiff" value={c.parties?.plaintiff} placeholder="Your name" />
        <Field label="Defendant" value={c.parties?.defendant} placeholder="Other party" />

        <TextBlock label="Facts" value={c.facts} placeholder="Placeholder…" />
        <TextBlock label="Damages" value={c.damages} placeholder="Placeholder…" />

        <TextBlock
          label="Exhibits"
          value={c.exhibits?.length ? c.exhibits.join(", ") : ""}
          placeholder="None yet (placeholder)."
        />

        <div style={{ marginTop: "18px" }}>
          <PrimaryButton href={ROUTES.dashboard}>Go to Dashboard</PrimaryButton>

          <SecondaryButton href={ROUTES.preview} style={{ marginLeft: "12px" }}>
            Preview Packet
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
