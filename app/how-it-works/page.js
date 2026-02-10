// Path: /app/how-it-works/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import SecondaryButton from "../_components/SecondaryButton";
import { ROUTES } from "../_config/routes";

export default function HowItWorksPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <PageTitle>How It Works</PageTitle>

        <TextBlock>
          Thoxie helps California users prepare and organize a small claims case with guided workflows,
          document drafting assistance, and case management. It does not provide legal advice.
        </TextBlock>

        <TextBlock>
          You start by selecting your jurisdiction (state → county → court). Then you enter the facts in plain
          English, track damages, and organize documents. The app generates draft packets you can review and
          download before filing.
        </TextBlock>

        <TextBlock>
          Thoxie can explain legal concepts and procedures in plain language, suggest missing information,
          and help you present your position clearly — but it cannot predict outcomes or file on your behalf.
        </TextBlock>

        <div style={{ marginTop: "18px" }}>
          <SecondaryButton href={ROUTES.home}>Back to Home</SecondaryButton>
        </div>
      </Container>

      <Footer />
    </main>
  );
}


