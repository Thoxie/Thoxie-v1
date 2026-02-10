// Path: /app/how-it-works/page.js
export const dynamic = "force-dynamic";

"use client";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";

export default function HowItWorksPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <PageTitle>How It Works</PageTitle>

        <TextBlock>
          Thoxie helps you prepare and organize a California small-claims case. It does not
          provide legal advice.
        </TextBlock>

        <TextBlock>
          You select your jurisdiction, enter facts in plain English, upload documents, and
          generate draft materials to bring to court.
        </TextBlock>
      </Container>

      <Footer />
    </main>
  );
}

