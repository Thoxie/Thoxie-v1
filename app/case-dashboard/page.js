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

  // If a caseId is present, show the per-case hub.
  if (caseId) {
    return <CaseHub caseId={caseId} />;
  }

  // Otherwise, show the case list (existing behavior).
  return <CaseList />;
}

function CaseList() {
  const [cases, setCases] = useState([]);

  function refresh() {
    setCases(
      CaseRepository.getAll().sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || "")
      )
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleDelete(id) {
    const ok = window.confirm(
      "Delete this case from your browser storage? This cannot be undone."
    );
    if (!ok) return;
    CaseRepository.delete(id);
    refresh();
  }

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <PageTitle>Case Dashboard</PageTitle>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <PrimaryButton href={ROUTES.intake}>Start / Edit Intake</PrimaryButton>
          <SecondaryButton href={ROUTES.documents}>Documents</SecondaryButton>
          <SecondaryButton href={ROUTES.filingGuidance}>Filing Guidance</SecondaryButton>
        </div>

        {cases.length === 0 ? (
          <div style={{ marginTop: 18 }}>
            <EmptyState
              title="No cases yet"
              description="Start by creating a case in the Intake Wizard."
              actions={
                <PrimaryButton href={ROUTES.intake}>Create a Case</PrimaryButton>
              }
            />
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>
              Recent Cases
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {cases.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {c.parties?.plaintiff || "Plaintiff"} vs{" "}
                    {c.parties?.defendant || "Defendant"}
                  </div>

                  <div style={{ marginTop: 6, color: "#555", lineHeight: 1.6 }}>
                    <div>
                      <b>County:</b> {c.jurisdiction?.county || "—"}{" "}
                      <span style={{ margin: "0 6px" }}>·</span>
                      <b>Court:</b> {c.jurisdiction?.courtName || "—"}
                    </div>
                    <div>
                      <b>Damages:</b>{" "}
                      {typeof c.damages === "number"
                        ? `$${c.damages.toLocaleString()}`
                        : "—"}
                      <span style={{ margin: "0 6px" }}>·</span>
                      <b>Updated:</b> {c.updatedAt ? c.updatedAt.slice(0, 10) : "—"}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <PrimaryButton href={`${ROUTES.dashboard}?caseId=${encodeURIComponent(c.id)}`}>
                      Open Hub
                    </PrimaryButton>

                    <SecondaryButton href={`${ROUTES.documents}?caseId=${encodeURIComponent(c.id)}`}>
                      Documents
                    </SecondaryButton>

                    <SecondaryButton href={`${ROUTES.intake}?caseId=${encodeURIComponent(c.id)}`}>
                      Edit Intake
                    </SecondaryButton>

                    <SecondaryButton onClick={() => handleDelete(c.id)}>
                      Delete
                    </SecondaryButton>
                  </div>
                </div>
              ))}
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
