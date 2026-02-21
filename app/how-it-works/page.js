// Path: /app/how-it-works/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import HowItWorksStatic from "./HowItWorksStatic";

export default function HowItWorksPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, paddingTop: "6px" }}>
        <HowItWorksStatic />
      </Container>

      <Footer />
    </main>
  );
}
