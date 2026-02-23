// Path: /app/case-dashboard/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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

function CaseDashboardInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId") || "";

  if (caseId) return <CaseHub caseId={caseId} />;
  return <SingleCasePanel />;
}

function SingleCasePanel() {
  const [caseItem, setCaseItem] = useState(null);
  const [hasMultiple, setHasMultiple] = useState(false);

  function refresh() {
    const list = CaseRepository.getAll() || [];
    setHasMultiple(list.length > 1);
    setCaseItem(list[0] || null); // single-case beta: show most recent
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleDelete(id) {
    const ok = window.confirm("Delete this case from browser storage? This cannot be undone.");
    if (!ok) return;
    CaseRepository.delete(id);
    refresh();
  }

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <PageTitle>Case Dashboard</PageTitle>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <PrimaryButton href={ROUTES.intake}>Start / Edit Intake</PrimaryButton>
          <SecondaryButton href={ROUTES.documents}>Documents</SecondaryButton>
          <SecondaryButton href={ROUTES.filingGuidance}>Filing Guidance</SecondaryButton>
        </div>

        {hasMultiple ? (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #f0c36d",
              background: "#fff7e6",
              color: "#5a3b00",
              fontWeight: 800
            }}
          >
            Multiple cases were found in this browser. Beta mode supports one case — showing the most recent.
          </div>
        ) : null}

        {!caseItem ? (
          <EmptyState
            title="No cases yet"
            message="Start by creating your case."
            ctaHref={ROUTES.start}
            ctaLabel="Create a Case"
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                background: "#fff"
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {(caseItem.parties?.plaintiff || "Plaintiff")} vs {(caseItem.parties?.defendant || "Defendant")}
              </div>

              <div style={{ marginTop: 6, color: "#555", lineHeight: 1.6 }}>
                <div>
                  <b>County:</b> {caseItem.jurisdiction?.county || "—"}{" "}
                  <span style={{ margin: "0 6px" }}>·</span>
                  <b>Court:</b> {caseItem.jurisdiction?.courtName || "—"}
                </div>
                <div>
                  <b>Damages:</b>{" "}
                  {typeof caseItem.damages === "number" ? `$${caseItem.damages.toLocaleString()}` : "—"}
                  <span style={{ margin: "0 6px" }}>·</span>
                  <b>Updated:</b> {caseItem.updatedAt ? String(caseItem.updatedAt).slice(0, 10) : "—"}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <PrimaryButton href={`${ROUTES.dashboard}?caseId=${encodeURIComponent(caseItem.id)}`}>
                  Open Hub
                </PrimaryButton>

                <SecondaryButton href={`${ROUTES.documents}?caseId=${encodeURIComponent(caseItem.id)}`}>
                  Documents
                </SecondaryButton>

                <SecondaryButton href={`${ROUTES.intake}?caseId=${encodeURIComponent(caseItem.id)}`}>
                  Edit Intake
                </SecondaryButton>

                <SecondaryButton onClick={() => handleDelete(caseItem.id)}>Delete</SecondaryButton>
              </div>
            </div>
          </div>
        )}
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

