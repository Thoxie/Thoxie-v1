// Path: /app/filing-guidance/print/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Container from "../../_components/Container";
import PageTitle from "../../_components/PageTitle";
import SecondaryButton from "../../_components/SecondaryButton";
import PrimaryButton from "../../_components/PrimaryButton";
import TextBlock from "../../_components/TextBlock";

import { ROUTES } from "../../_config/routes";
import { CaseRepository } from "../../_repository/caseRepository";
import { getChecklistForCase, getCourtInfoFromCase, getRoleLabel } from "../../_lib/filingGuidance";

export default function FilingGuidancePrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <PrintInner />
    </Suspense>
  );
}

function PrintInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) {
      setError("Missing caseId.");
      setC(null);
      return;
    }
    const found = CaseRepository.getById(caseId);
    if (!found) {
      setError("Case not found in this browser.");
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
      <Container style={{ padding: "18px 0" }}>
        <PageTitle>Print Checklist</PageTitle>
        <TextBlock>{error}</TextBlock>
        <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
      </Container>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Screen-only controls */}
      <div style={{ padding: 16, borderBottom: "1px solid #eee" }} className="no-print">
        <Container>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <PrimaryButton onClick={() => window.print()}>Print</PrimaryButton>
            <SecondaryButton href={`${ROUTES.filingGuidance}?caseId=${encodeURIComponent(caseId)}`}>
              Back to Filing Guidance
            </SecondaryButton>
            <SecondaryButton href={ROUTES.dashboard}>Dashboard</SecondaryButton>
          </div>
        </Container>
      </div>

      {/* Printable content */}
      <Container style={{ padding: "18px 0" }}>
        <PageTitle>THOXIE — Filing Checklist (CA)</PageTitle>

        <div style={{ marginTop: 10, lineHeight: 1.7 }}>
          <div><b>County:</b> {courtInfo.county}</div>
          <div><b>Role:</b> {roleLabel}</div>
          <div><b>Court:</b> {courtInfo.courtName}</div>
          <div><b>Address:</b> {courtInfo.courtAddress}</div>
          {courtInfo.clerkUrl ? <div><b>Court site:</b> {courtInfo.clerkUrl}</div> : null}
          {courtInfo.notes ? <div><b>Notes:</b> {courtInfo.notes}</div> : null}
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Checklist</div>
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            {checklist.map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: "#666", lineHeight: 1.5 }}>
          General procedural guidance only. Confirm current forms/rules on your court’s website.
        </div>
      </Container>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          a {
            text-decoration: none;
            color: black;
          }
        }
      `}</style>
    </div>
  );
}

