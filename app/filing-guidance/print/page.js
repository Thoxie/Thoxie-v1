// PATH: /app/filing-guidance/print/page.js
// DIRECTORY: /app/filing-guidance/print
// FILE: page.js
// ACTION: FULL OVERWRITE

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
import {
  getChecklistForCase,
  getCourtInfoFromCase,
  getRoleLabel,
} from "../../_lib/filingGuidance";

export default function FilingGuidancePrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
      <PrintInner />
    </Suspense>
  );
}

function PrintInner() {
  const searchParams = useSearchParams();
  const caseIdParam = String(searchParams.get("caseId") || "").trim();

  const [c, setC] = useState(null);
  const [activeCaseId, setActiveCaseId] = useState("");
  const [loadingCase, setLoadingCase] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      let fallbackActiveId = "";

      try {
        fallbackActiveId = String(CaseRepository.getActiveId?.() || "").trim();
      } catch {
        fallbackActiveId = "";
      }

      const resolvedCaseId = caseIdParam || fallbackActiveId;

      if (!resolvedCaseId) {
        if (!cancelled) {
          setError("Missing caseId. Go back to Dashboard and open a case first.");
          setC(null);
          setActiveCaseId("");
          setLoadingCase(false);
        }
        return;
      }

      if (!cancelled) {
        setLoadingCase(true);
        setError("");
      }

      try {
        const loadedCase = await CaseRepository.loadById(resolvedCaseId);

        if (!loadedCase) {
          if (!cancelled) {
            setError("Case not found. Go back to Dashboard.");
            setC(null);
            setActiveCaseId("");
            setLoadingCase(false);
          }
          return;
        }

        if (cancelled) return;

        setError("");
        setC(loadedCase);
        setActiveCaseId(loadedCase.id);
      } catch (err) {
        console.error("FILING GUIDANCE PRINT LOAD ERROR:", err);

        if (cancelled) return;

        setError(err?.message || "Case not found. Go back to Dashboard.");
        setC(null);
        setActiveCaseId("");
      } finally {
        if (!cancelled) {
          setLoadingCase(false);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [caseIdParam]);

  const currentCaseId = activeCaseId || caseIdParam || "";
  const dashboardHref = currentCaseId
    ? `${ROUTES.dashboard}?caseId=${encodeURIComponent(currentCaseId)}`
    : ROUTES.dashboard;
  const filingGuidanceHref = currentCaseId
    ? `${ROUTES.filingGuidance}?caseId=${encodeURIComponent(currentCaseId)}`
    : ROUTES.filingGuidance;

  const roleLabel = getRoleLabel(c);
  const courtInfo = useMemo(() => getCourtInfoFromCase(c), [c]);
  const checklist = useMemo(() => getChecklistForCase(c), [c]);

  if (loadingCase) {
    return (
      <Container style={{ padding: "18px 0" }}>
        <PageTitle>Print Checklist</PageTitle>
        <TextBlock>Loading case...</TextBlock>
      </Container>
    );
  }

  if (error) {
    return (
      <Container style={{ padding: "18px 0" }}>
        <PageTitle>Print Checklist</PageTitle>
        <TextBlock>{error}</TextBlock>
        <SecondaryButton href={dashboardHref}>Back to Dashboard</SecondaryButton>
      </Container>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{ padding: 16, borderBottom: "1px solid #eee" }}
        className="no-print"
      >
        <Container>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <PrimaryButton onClick={() => window.print()}>
              Print
            </PrimaryButton>

            <SecondaryButton href={filingGuidanceHref}>
              Back to Filing Guidance
            </SecondaryButton>

            <SecondaryButton href={dashboardHref}>
              Dashboard
            </SecondaryButton>
          </div>
        </Container>
      </div>

      <Container style={{ padding: "18px 0" }}>
        <PageTitle>Small Claims Genie - Filing Checklist (CA)</PageTitle>

        <div style={{ marginTop: 10, lineHeight: 1.7 }}>
          <div>
            <b>County:</b> {courtInfo.county}
          </div>
          <div>
            <b>Role:</b> {roleLabel}
          </div>
          <div>
            <b>Court:</b> {courtInfo.courtName}
          </div>
          <div>
            <b>Address:</b> {courtInfo.courtAddress}
          </div>
          {courtInfo.clerkUrl ? (
            <div>
              <b>Court site:</b> {courtInfo.clerkUrl}
            </div>
          ) : null}
          {courtInfo.notes ? (
            <div>
              <b>Notes:</b> {courtInfo.notes}
            </div>
          ) : null}
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

        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "#666",
            lineHeight: 1.5,
          }}
        >
          General procedural guidance only. Confirm current forms/rules on your
          court&#39;s website.
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
