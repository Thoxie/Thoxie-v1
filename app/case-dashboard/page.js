// Path: /app/case-dashboard/page.js
"use client";

import { useEffect, useState } from "react";
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import EmptyState from "../_components/EmptyState";
import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";

export default function CaseDashboardPage() {
  const [cases, setCases] = useState([]);

  function refresh() {
    setCases(CaseRepository.getAll().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")));
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleDelete(id) {
    const ok = window.confirm("Delete this case from your browser storage? This cannot be undone.");
    if (!ok) return;
    CaseRepository.delete(id);
    refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ marginTop: 0 }}>Case Dashboard</h1>

        {cases.length === 0 ? (
          <EmptyState
            title="Start a New Case"
            message="Create a new California small claims case. Cases are currently stored in your browser (localStorage)."
            ctaHref={ROUTES.start}
            ctaLabel="New Case"
          />
        ) : (
          <>
            <div style={{ marginTop: "10px", color: "#666", fontSize: "13px" }}>
              Cases are stored locally in this browser for now. We’ll later swap the repository to Vercel Postgres without changing the UI flow.
            </div>

            <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
              {cases.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: "1px solid #e6e6e6",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    background: "#fff",
                    maxWidth: "920px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>
                      {c.jurisdiction?.county || "Unknown County"} County — {c.role === "defendant" ? "Defendant" : "Plaintiff"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "(unknown)"}
                    </div>
                  </div>

                  <div style={{ marginTop: "6px", color: "#333" }}>
                    <div>Category: <strong>{c.category || "(not set)"}</strong></div>
                    <div>Status: <strong>{c.status || "draft"}</strong></div>
                    <div style={{ marginTop: "6px", fontSize: "13px", color: "#555" }}>
                      Court: {c.jurisdiction?.courtName || "(not set)"} — {c.jurisdiction?.courtAddress || ""}
                    </div>
                  </div>

                  <div style={{ marginTop: "12px" }}>
                    <SecondaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(c.id)}`}>
                      Preview Packet
                    </SecondaryButton>

                    <SecondaryButton href={`${ROUTES.intake || "/intake-wizard"}?caseId=${encodeURIComponent(c.id)}`} style={{ marginLeft: "10px" }}>
                      Edit Intake
                    </SecondaryButton>

                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      style={{
                        marginLeft: "10px",
                        border: "1px solid #ddd",
                        background: "#fff",
                        borderRadius: "12px",
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontWeight: 800
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: "18px" }}>
          <PrimaryButton href={ROUTES.start}>New Case</PrimaryButton>
          <SecondaryButton href={ROUTES.home} style={{ marginLeft: "12px" }}>
            Home
          </SecondaryButton>
        </div>
      </Container>

      <Footer />
    </main>
  );
}
