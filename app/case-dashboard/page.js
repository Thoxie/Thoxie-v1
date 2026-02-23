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
 * - If a case exists, always show the Case Hub (even when no caseId is in the URL).
 * - If no case exists, show a clear empty state.
 * - Keep the top bar (Start/Edit Intake, Documents, Filing Guidance) exactly as-is.
 */

function DashboardTopBar({ caseId }) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
      <PrimaryButton
        href={caseId ? `${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}` : ROUTES.start}
        onClick={(e) => {
          // Keep navigation consistent with the single-case model
          e.preventDefault();
          router.push(caseId ? `${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}` : ROUTES.start);
        }}
      >
        Start / Edit Intake
      </PrimaryButton>

      <SecondaryButton
        href={caseId ? `${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}` : ROUTES.documents}
        onClick={(e) => {
          e.preventDefault();
          router.push(caseId ? `${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}` : ROUTES.documents);
        }}
      >
        Documents
      </SecondaryButton>

      <SecondaryButton
        href={ROUTES.filingGuidance}
        onClick={(e) => {
          e.preventDefault();
          router.push(ROUTES.filingGuidance);
        }}
      >
        Filing Guidance
      </SecondaryButton>
    </div>
  );
}

function CaseDashboardInner() {
  const searchParams = useSearchParams();
  const urlCaseId = (searchParams.get("caseId") || "").trim();

  // Phase 3 rule:
  // - URL caseId wins
  // - otherwise use active case (single-case beta)
  const effectiveCaseId = useMemo(() => {
    if (urlCaseId) return urlCaseId;
    try {
      return CaseRepository.getActiveId() || "";
    } catch {
      return "";
    }
  }, [urlCaseId]);

  if (!effectiveCaseId) {
    return (
      <Container>
        <div style={{ padding: "18px 0" }}>
          <PageTitle>Case Dashboard</PageTitle>

          {/* Keep the top bar present even when empty (your preference: keep UI stable) */}
          <DashboardTopBar caseId="" />

          <EmptyState
            title="No case yet"
            message="Create your case to unlock the dashboard workspace."
            ctaHref={ROUTES.start}
            ctaLabel="Create a Case"
          />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <PageTitle>Case Dashboard</PageTitle>

        {/* Keep top bar exactly as you want */}
        <DashboardTopBar caseId={effectiveCaseId} />

        {/* Mission Control: always show the hub for the active case */}
        <CaseHub caseId={effectiveCaseId} />
      </div>
    </Container>
  );
}

export default function CaseDashboardPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
        <CaseDashboardInner />
      </Suspense>
      <Footer />
    </main>
  );
}

