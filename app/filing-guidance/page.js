// Path: /app/filing-guidance/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import SecondaryButton from "../_components/SecondaryButton";
import PrimaryButton from "../_components/PrimaryButton";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { getChecklistForCase, getCourtInfoFromCase, getRoleLabel } from "../_lib/filingGuidance";

export default function FilingGuidancePage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <FilingGuidanceInner />
    </Suspense>
  );
}

function FilingGuidanceInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) {
      setError("Missing caseId. Go to Dashboard → open a case → Filing Guidance.");
      setC(null);
      return;
    }
    const found = CaseRepository.getById(caseId);
    if (!found) {
      setError("Case not found in this browser. Go back to Dashboard.");
      setC(null);
      return;
    }
    setError("");
    setC(found);
  }, [caseId]);

  const roleLabel = getRoleLabel(c);

  const courtInfo = useMemo(() => getCourtInfoFromCase(c), [c]);
  const checklist = useMemo(() => getChecklistForCase(c), [c]);

  if (error) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header />
        <Container style={{ flex: 1 }}>
          <PageTitle>Filing Guidance</PageTitle>
          <TextBlock>{error}</TextBlock>
          <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
        </Container>
        <Footer />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Filing Guidance (California)</PageTitle>

        <TextBlock>
          This is general procedural guidance (not legal advice). Always confirm current rules and forms
          on your court’s website.
        </TextBlock>

        <div style={card}>
          <div style={{ fontWeight: 900 }}>
            {courtInfo.county} County — {roleLabel}
          </div>

          <div style={{ marginTop: "8px", color: "#333" }}>
            <div><strong>Court:</strong> {courtInfo.courtName}</div>
            <div><strong>Address:</strong> {courtInfo.courtAddress}</div>

            {courtInfo.clerkUrl ? (
              <div style={{ marginTop: "8px" }}>
                <strong>Court site:</strong>{" "}
                <a href={courtInfo.clerkUrl} target="_blank" rel="noreferrer">
                  {courtInfo.clerkUrl}
                </a>
              </div>
            ) : null}

            {courtInfo.notes ? (
              <div style={{ marginTop: "10px", fontSize: 12, color: "#555", lineHeight: 1.5 }}>
                <strong>Notes:</strong> {courtInfo.notes}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <SecondaryButton href={`${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}`}>
              Documents
            </SecondaryButton>

            <SecondaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(caseId)}`}>
              Preview Packet
            </SecondaryButton>

            <SecondaryButton href={`${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`}>
              Edit Intake
            </SecondaryButton>

            <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>

            <PrimaryButton href={`/filing-guidance/print?caseId=${encodeURIComponent(caseId)}`}>
              Print Checklist
            </PrimaryButton>
          </div>
        </div>

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "10px" }}>Checklist</div>
          <ol style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.7 }}>
            {checklist.map((item) => (
              <li key={item} style={{ marginBottom: "8px" }}>
                {item}
              </li>
            ))}
          </ol>

          <div style={{ marginTop: "12px", fontSize: "12px", color: "#666", lineHeight: 1.5 }}>
            Note: Some counties have local rules/forms and different service timelines. This module is
            designed to become court-config-driven as we expand beyond California.
          </div>
        </div>
      </Container>

      <Footer />
    </main>
  );
}

const card = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "14px 16px",
  background: "#fff",
  maxWidth: "920px"
};
