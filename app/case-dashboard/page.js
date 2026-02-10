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
    setCases(
      CaseRepository.getAll().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    );
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

  function formatStatus(s) {
    if (!s) return "Draft";
    if (s === "filed") return "Filed";
    if (s === "ready") return "Ready to file";
    return "Draft";
  }

  function serviceLine(c) {
    const method = (c?.serviceMethod || "").trim();
    const deadline = (c?.serviceDeadline || "").trim();
    const served = (c?.dateServed || "").trim();
    const pos = (c?.proofOfServiceStatus || "").trim();

    const parts = [];
    if (method) parts.push(method);
    if (deadline) parts.push(`deadline ${deadline}`);
    if (served) parts.push(`served ${served}`);
    if (pos) parts.push(`POS: ${pos}`);

    return parts.length ? parts.join(" • ") : "(not set)";
  }

  function keyDatesLine(c) {
    const filed = (c?.filedDate || "").trim();
    const hearingD = (c?.hearingDate || "").trim();
    const hearingT = (c?.hearingTime || "").trim();

    const bits = [];
    if (filed) bits.push(`filed ${filed}`);
    if (hearingD && hearingT) bits.push(`hearing ${hearingD} ${hearingT}`);
    else if (hearingD) bits.push(`hearing ${hearingD}`);

    return bits.length ? bits.join(" • ") : "(not set)";
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleExport(id) {
    const json = CaseRepository.exportCase(id);
    if (!json) {
      alert("Case not found.");
      return;
    }
    downloadText(`thoxie-case-${id}.json`, json);
  }

  function handleImport() {
    const json = window.prompt("Paste a case JSON export to import:");
    if (!json) return;

    try {
      CaseRepository.importCase(json);
      refresh();
      alert("Imported. (If the ID already existed, Thoxie created a new case ID.)");
    } catch (e) {
      alert(e?.message || "Import failed.");
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <h1 style={{ marginTop: 0 }}>Case Dashboard</h1>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <SecondaryButton
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleImport();
              }}
            >
              Import Case JSON
            </SecondaryButton>

            <PrimaryButton href={ROUTES.start}>New Case</PrimaryButton>
          </div>
        </div>

        {cases.length === 0 ? (
          <EmptyState
            title="Start a New Case"
            message="Create a new California small claims case. Cases are currently stored in your browser (localStorage)."
            ctaHref={ROUTES.start}
            ctaLabel="New Case"
          />
        ) : (
          <>
            <div style={{ marginTop: "6px", color: "#666", fontSize: "13px" }}>
              Cases are stored locally in this browser for now.
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
                      {c.jurisdiction?.county || "Unknown County"} County —{" "}
                      {c.role === "defendant" ? "Defendant" : "Plaintiff"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "(unknown)"}
                    </div>
                  </div>

                  <div style={{ marginTop: "6px", color: "#333" }}>
                    <div>
                      Category: <strong>{c.category || "(not set)"}</strong>
                    </div>
                    <div>
                      Filing Status: <strong>{formatStatus(c.status)}</strong>
                    </div>
                    <div>
                      Case Number: <strong>{c.caseNumber?.trim() ? c.caseNumber : "(not set)"}</strong>
                    </div>
                    <div>
                      Key Dates: <strong>{keyDatesLine(c)}</strong>
                    </div>
                    <div>
                      Service Tracking: <strong>{serviceLine(c)}</strong>
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "13px", color: "#555" }}>
                      Court: {c.jurisdiction?.courtName || "(not set)"} — {c.jurisdiction?.courtAddress || ""}
                    </div>
                  </div>

                  <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    <SecondaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(c.id)}`}>
                      Preview Packet
                    </SecondaryButton>

                    <SecondaryButton href={`/intake-wizard?caseId=${encodeURIComponent(c.id)}`}>
                      Edit Intake
                    </SecondaryButton>

                    <SecondaryButton href={`/key-dates?caseId=${encodeURIComponent(c.id)}`}>
                      Key Dates
                    </SecondaryButton>

                    <SecondaryButton
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleExport(c.id);
                      }}
                    >
                      Export JSON
                    </SecondaryButton>

                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      style={{
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
          <SecondaryButton href={ROUTES.home}>Home</SecondaryButton>
        </div>
      </Container>

      <Footer />
    </main>
  );
}

