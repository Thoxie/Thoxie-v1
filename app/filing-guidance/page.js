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

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";

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
      setError("Missing caseId. Go to Dashboard → click “Filing Guidance.”");
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

  const courtName = c?.jurisdiction?.courtName || "(not set)";
  const courtAddress = c?.jurisdiction?.courtAddress || "(not set)";
  const clerkUrl = c?.jurisdiction?.clerkUrl || "";
  const county = c?.jurisdiction?.county || "(not set)";
  const role = c?.role === "defendant" ? "Defendant" : "Plaintiff";

  const checklist = useMemo(() => {
    // CA-only v1 checklist. County/court nuances can be config-driven later.
    if (!c) return [];
    if (c.role === "defendant") {
      return [
        "Confirm the hearing date/time and department on your court notice.",
        "Prepare your defense story in 1–2 pages (timeline + key facts).",
        "Organize exhibits (contracts, receipts, photos, messages). Bring 3 copies if required.",
        "Check whether a written response is required in your county/court for your situation (varies).",
        "If you have witnesses, confirm availability and whether the court allows witness declarations.",
        "Arrive early with copies, an exhibit index, and a short outline of what you’ll tell the judge."
      ];
    }
    return [
      "Confirm you are in the correct venue (county/court).",
      "Identify the correct small claims forms for your county/court (usually SC-100 for Plaintiff claim; some counties have local forms).",
      "Prepare your claim narrative: who, what happened, when, and the amount requested.",
      "Prepare your exhibits (contracts, receipts, invoices, messages, photos).",
      "Make copies as required (often: court + each defendant + you).",
      "File with the clerk (in-person / mail / eFile if your court supports it). Pay filing fee.",
      "Serve the defendant properly and on time (service rules & deadlines vary; confirm on your court site).",
      "Prepare a hearing outline (2–5 minutes opening, then evidence, then close)."
    ];
  }, [c]);

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
          <div style={{ fontWeight: 900 }}>{county} County — {role}</div>
          <div style={{ marginTop: "8px", color: "#333" }}>
            <div><strong>Court:</strong> {courtName}</div>
            <div><strong>Address:</strong> {courtAddress}</div>
            {clerkUrl ? (
              <div style={{ marginTop: "8px" }}>
                <strong>Court site:</strong>{" "}
                <a href={clerkUrl} target="_blank" rel="noreferrer">
                  {clerkUrl}
                </a>
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

