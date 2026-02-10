// Path: /app/document-preview/page.js
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import CasePacket from "../_components/CasePacket";
import SecondaryButton from "../_components/SecondaryButton";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import PrimaryButton from "../_components/PrimaryButton";

import { CaseRepository } from "../_repository/caseRepository";

export default function DocumentPreviewPage() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);

  useEffect(() => {
    if (!caseId) {
      setC(null);
      return;
    }
    const found = CaseRepository.getById(caseId);
    setC(found || null);
  }, [caseId]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <PageTitle>Document Preview (Draft Packet)</PageTitle>
          <PrimaryButton
            href="#"
            style={{ height: "fit-content" }}
            onClick={(e) => {
              e.preventDefault();
              window.print();
            }}
          >
            Print
          </PrimaryButton>
        </div>

        {!caseId ? (
          <div style={{ marginTop: "14px", padding: "14px", border: "1px solid #eee", borderRadius: "12px" }}>
            <div style={{ fontWeight: 900 }}>No case selected</div>
            <div style={{ marginTop: "6px", color: "#555" }}>
              Return to the dashboard and click “Preview Packet” on a case.
            </div>
          </div>
        ) : !c ? (
          <div style={{ marginTop: "14px", padding: "14px", border: "1px solid #eee", borderRadius: "12px" }}>
            <div style={{ fontWeight: 900 }}>Case not found</div>
            <div style={{ marginTop: "6px", color: "#555" }}>
              The caseId in the URL wasn’t found in localStorage. It may have been deleted or you’re in a different browser.
            </div>
          </div>
        ) : (
          <CasePacket c={c} />
        )}

        <div style={{ marginTop: "18px" }}>
          <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>

          {caseId && (
            <SecondaryButton
              href={`/intake-wizard?caseId=${encodeURIComponent(caseId)}`}
              style={{ marginLeft: "12px" }}
            >
              Edit Intake
            </SecondaryButton>
          )}
        </div>
      </Container>

      <Footer />
    </main>
  );
}

