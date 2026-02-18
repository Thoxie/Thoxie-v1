// Path: /app/ai-chatbox/page.js
"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import SecondaryButton from "../_components/SecondaryButton";

function Inner() {
  const sp = useSearchParams();
  const caseId = (sp.get("caseId") || "").trim();

  useEffect(() => {
    // Open the dock when this page is visited (wiring test + convenience).
    window.dispatchEvent(new Event("thoxie:open-chat"));
  }, []);

  return (
    <>
      <Header />
      <Container>
        <PageTitle title="AI Chat" subtitle="Global chat dock is enabled across the app." />
        <TextBlock>
          Use the Chat button in the bottom-right on any page. This screen is now mainly for testing and deep links.
        </TextBlock>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
          <SecondaryButton
            onClick={() => window.dispatchEvent(new Event("thoxie:open-chat"))}
            text="Open Chat Dock"
          />
          {caseId ? (
            <TextBlock>Case context detected: <b>{caseId}</b> (passed into the dock when present in the URL).</TextBlock>
          ) : null}
        </div>
      </Container>
      <Footer />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

