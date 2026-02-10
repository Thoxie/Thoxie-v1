// Path: /app/document-preview/page.js
export const dynamic = "force-dynamic";

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import SecondaryButton from "../_components/SecondaryButton";
import PrimaryButton from "../_components/PrimaryButton";
import CasePacket from "../_components/CasePacket";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";

export default function DocumentPreviewPage() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");
  const [c, setC] = useState(null);

  useEffect(() => {
    if (!caseId) return;
    setC(CaseRepository.getById(caseId));
  }, [caseId]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <PageTitle>Document Preview</PageTitle>

        {!c ? (
          <div>No case selected.</div>
        ) : (
          <CasePacket c={c} />
        )}

        <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
        <PrimaryButton onClick={() => window.print()}>Print</PrimaryButton>
      </Container>

      <Footer />
    </main>
  );
}



