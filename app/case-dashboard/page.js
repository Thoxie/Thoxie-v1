// Path: /app/case-dashboard/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import EmptyState from "../_components/EmptyState";
import PageTitle from "../_components/PageTitle";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";

import CaseHub from "./CaseHub";

/**
 * Phase 3: Dashboard becomes "Mission Control"
 * - If a case exists, always show the Case Hub
 * - If no case exists, show a clear empty state.
 * - Keep the top bar (Start/Edit Intake, Documents, Filing Guidance) exactly as-is.
 */

function DashboardTopBar({ caseId }) {
  const router = useRouter();

  return (
    // CHANGE: marginBottom reduced to cut the gap above the case header
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 7 }}>
      <PrimaryButton
        href={caseId ? `${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}` : ROUTES.start}
        onClick={(e) => {
          e.preventDefault();
          router.push(caseId ? `${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}` : ROUTES.start);
        }}
      >
        Start / Edit Intake
      </PrimaryButton>

      <SecondaryButton href={caseId ? `${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}` : ROUTES.documents}>
        Documents
      </SecondaryButton>

      <SecondaryButton
        href={caseId ? `${ROUTES.filingGuidance}?caseId=${encodeURIComponent(caseId)}` : ROUTES.filingGuidance}
      >
        Filing Guidance
      </SecondaryButton>
    </div>
  );
}

export default function CaseDashboardPage() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const primaryCaseId = useMemo(() => {
    if (caseId) return caseId;
    const c = CaseRepository.getPrimaryCase?.();
    return c?.id || c?.caseId || c?.case_id || c?.uuid || c?.caseId || c?.caseID || c?.case || c?.id;
  }, [caseId]);

  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header />
        <Container style={{ flex: 1 }}>
          <PageTitle>Case Dashboard</PageTitle>

          <DashboardTopBar caseId={primaryCaseId} />

          {primaryCaseId ? (
            <CaseHub caseId={primaryCaseId} />
          ) : (
            <EmptyState
              title="No case yet"
              message="Start a case to begin building your small claims filing."
              ctaHref={ROUTES.start}
              ctaLabel="Start"
            />
          )}
        </Container>
        <Footer />
      </main>
    </Suspense>
  );
}
