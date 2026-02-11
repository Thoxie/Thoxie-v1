// Path: /app/ai-chatbox/page.js
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import SecondaryButton from "../_components/SecondaryButton";

import { ROUTES } from "../_config/routes";
import AIChatbox from "../../src/components/AIChatbox";

export default function AIChatboxPage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <AIChatboxInner />
    </Suspense>
  );
}

function AIChatboxInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId") || "";

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>AI Assistant</PageTitle>

        <TextBlock>
          This is the v1 on-screen assistant scaffold. It is not connected to an AI model yet, but it does save chat per case in your browser
          and can guide the workflow (intake, documents, preview packet, and filing steps).
        </TextBlock>

        <div style={{ marginBottom: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
          {caseId ? (
            <>
              <SecondaryButton href={`${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`}>Edit Intake</SecondaryButton>
              <SecondaryButton href={`${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}`}>Documents</SecondaryButton>
              <SecondaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(caseId)}`}>Preview Packet</SecondaryButton>
            </>
          ) : null}
        </div>

        <AIChatbox caseId={caseId} />
      </Container>

      <Footer />
    </main>
  );
}
