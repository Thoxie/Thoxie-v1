// Path: /app/document-preview/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import SecondaryButton from "../_components/SecondaryButton";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

export default function DocumentPreviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <PreviewInner />
    </Suspense>
  );
}

function PreviewInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!caseId) return;

    const found = CaseRepository.getById(caseId);
    if (!found) return;

    setC(found);

    async function loadDocs() {
      const rows = await DocumentRepository.listByCaseId(caseId);
      setDocs(rows || []);
    }

    loadDocs();
  }, [caseId]);

  if (!c) {
    return (
      <main style={{ minHeight: "100vh" }}>
        <Header />
        <Container>
          <PageTitle>Preview Packet</PageTitle>
          Case not found.
        </Container>
        <Footer />
      </main>
    );
  }

  const roleTitle =
    c.role === "defendant"
      ? "Defendant’s Response"
      : "Plaintiff’s Statement of Claim";

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Preview Packet</PageTitle>

        <div style={{ marginBottom: "12px", display: "flex", gap: "10px" }}>
          <SecondaryButton href={`${ROUTES.intake}?caseId=${c.id}`}>
            Edit Intake
          </SecondaryButton>
          <SecondaryButton href={`${ROUTES.documents}?caseId=${c.id}`}>
            Documents
          </SecondaryButton>
          <SecondaryButton href={`${ROUTES.dashboard}`}>
            Back to Dashboard
          </SecondaryButton>
        </div>

        {/* Printable Packet */}
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "24px",
            background: "#fff",
            maxWidth: "900px"
          }}
        >
          {/* Caption */}
          <div style={{ textAlign: "center", marginBottom: "18px" }}>
            <div style={{ fontWeight: 900 }}>
              Superior Court of California
            </div>
            <div>
              County of {c.jurisdiction?.county || "(Not Set)"}
            </div>
            <div style={{ marginTop: "6px", fontSize: "13px" }}>
              {c.jurisdiction?.courtName || ""} —{" "}
              {c.jurisdiction?.courtAddress || ""}
            </div>
          </div>

          <div style={{ marginBottom: "14px", fontSize: "14px" }}>
            <div>
              <strong>Plaintiff:</strong>{" "}
              {c.parties?.plaintiff || "(Not Provided)"}
            </div>
            <div>
              <strong>Defendant:</strong>{" "}
              {c.parties?.defendant || "(Not Provided)"}
            </div>
            <div>
              <strong>Case Number:</strong>{" "}
              {c.caseNumber?.trim() || "(Not Assigned)"}
            </div>
            <div>
              <strong>Hearing:</strong>{" "}
              {c.hearingDate
                ? `${c.hearingDate}${
                    c.hearingTime ? ` at ${c.hearingTime}` : ""
                  }`
                : "(Not Scheduled)"}
            </div>
          </div>

          <hr />

          {/* Title */}
          <div style={{ marginTop: "16px", fontWeight: 900 }}>
            {roleTitle}
          </div>

          {/* Facts */}
          <div style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
            {c.facts?.trim()
              ? c.facts
              : "(No facts entered yet.)"}
          </div>

          {/* Damages */}
          <div style={{ marginTop: "20px" }}>
            <strong>Damages Requested:</strong>{" "}
            ${Number(c.damages || 0).toLocaleString()}
          </div>

          {/* Exhibits */}
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontWeight: 900, marginBottom: "8px" }}>
              Exhibits
            </div>

            {docs.length === 0 ? (
              <div style={{ fontSize: "13px", color: "#666" }}>
                No exhibits uploaded.
              </div>
            ) : (
              <ul>
                {docs.map((d, index) => (
                  <li key={d.docId} style={{ marginBottom: "4px" }}>
                    Exhibit {String.fromCharCode(65 + index)} — {d.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Container>

      <Footer />
    </main>
  );
}
