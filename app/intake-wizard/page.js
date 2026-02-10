// Path: /app/intake-wizard/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";

export default function IntakeWizardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <IntakeWizardInner />
    </Suspense>
  );
}

function IntakeWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [error, setError] = useState("");

  const [plaintiff, setPlaintiff] = useState("");
  const [defendant, setDefendant] = useState("");
  const [facts, setFacts] = useState("");
  const [damages, setDamages] = useState("0");

  // NEW: filing lifecycle fields
  const [status, setStatus] = useState("draft");
  const [caseNumber, setCaseNumber] = useState("");
  const [filedDate, setFiledDate] = useState("");     // YYYY-MM-DD
  const [hearingDate, setHearingDate] = useState(""); // YYYY-MM-DD
  const [hearingTime, setHearingTime] = useState(""); // HH:MM

  useEffect(() => {
    if (!caseId) {
      setError("Missing caseId. Return to the dashboard and click “Edit Intake.”");
      setC(null);
      return;
    }

    const found = CaseRepository.getById(caseId);
    if (!found) {
      setError(
        "Case not found in localStorage. It may have been deleted or you’re in a different browser."
      );
      setC(null);
      return;
    }

    setError("");
    setC(found);

    setPlaintiff(found.parties?.plaintiff || "");
    setDefendant(found.parties?.defendant || "");
    setFacts(found.facts || "");
    setDamages(String(found.damages ?? 0));

    // NEW: hydrate lifecycle fields (backward compatible defaults)
    setStatus(found.status || "draft");
    setCaseNumber(found.caseNumber || "");
    setFiledDate(found.filedDate || "");
    setHearingDate(found.hearingDate || "");
    setHearingTime(found.hearingTime || "");
  }, [caseId]);

  const headerLine = useMemo(() => {
    if (!c) return "";
    const county = c.jurisdiction?.county || "Unknown County";
    const role = c.role === "defendant" ? "Defendant" : "Plaintiff";
    return `${county} County — ${role} — ${c.category || "Uncategorized"}`;
  }, [c]);

  function validateDamages() {
    const damagesNum = Number(damages);
    if (Number.isNaN(damagesNum) || damagesNum < 0) {
      alert("Damages must be a valid non-negative number.");
      return null;
    }
    return damagesNum;
  }

  function handleSave() {
    if (!c) return;

    const damagesNum = validateDamages();
    if (damagesNum === null) return;

    const updated = {
      ...c,
      parties: {
        ...(c.parties || {}),
        plaintiff: plaintiff.trim(),
        defendant: defendant.trim()
      },
      facts: facts.trim(),
      damages: damagesNum,

      // NEW
      status,
      caseNumber: caseNumber.trim(),
      filedDate: filedDate.trim(),
      hearingDate: hearingDate.trim(),
      hearingTime: hearingTime.trim()
    };

    CaseRepository.save(updated);
    router.push(`${ROUTES.preview}?caseId=${encodeURIComponent(updated.id)}`);
  }

  const fieldStyle = {
    width: "100%",
    maxWidth: "820px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    background: "#fff",
    marginTop: "6px",
    fontSize: "14px"
  };

  const labelStyle = {
    marginTop: "14px",
    fontWeight: 900,
    fontSize: "13px"
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Intake Wizard</PageTitle>

        <TextBlock>
          Enter core case details. This app stores your case data locally in your browser for now.
          It provides general information and drafting assistance — not legal advice.
        </TextBlock>

        {headerLine && <div style={{ fontWeight: 900, marginTop: "6px" }}>{headerLine}</div>}

        {error ? (
          <div style={{ marginTop: "14px", color: "#b00020", fontWeight: 800 }}>{error}</div>
        ) : !c ? (
          <div style={{ marginTop: "14px" }}>Loading…</div>
        ) : (
          <>
            {/* NEW: Filing / Court tracking */}
            <div style={labelStyle}>Filing Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={fieldStyle}>
              <option value="draft">Draft (not ready)</option>
              <option value="ready">Ready to file</option>
              <option value="filed">Filed</option>
            </select>

            <div style={labelStyle}>Case Number (after filing)</div>
            <input
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              style={fieldStyle}
              placeholder="Example: 24SCS012345"
            />

            <div style={labelStyle}>Filed Date</div>
            <input
              type="date"
              value={filedDate}
              onChange={(e) => setFiledDate(e.target.value)}
              style={fieldStyle}
            />

            <div style={labelStyle}>Hearing Date</div>
            <input
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              style={fieldStyle}
            />

            <div style={labelStyle}>Hearing Time</div>
            <input
              type="time"
              value={hearingTime}
              onChange={(e) => setHearingTime(e.target.value)}
              style={fieldStyle}
            />

            {/* Parties */}
            <div style={labelStyle}>Plaintiff</div>
            <input value={plaintiff} onChange={(e) => setPlaintiff(e.target.value)} style={fieldStyle} />

            <div style={labelStyle}>Defendant</div>
            <input value={defendant} onChange={(e) => setDefendant(e.target.value)} style={fieldStyle} />

            {/* Facts */}
            <div style={labelStyle}>Facts (what happened)</div>
            <textarea
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              style={{ ...fieldStyle, minHeight: "160px", lineHeight: 1.5 }}
              placeholder="Write what happened in plain English. Include dates, who did what, and what you want ordered."
            />

            {/* Damages */}
            <div style={labelStyle}>Damages (USD)</div>
            <input
              type="number"
              value={damages}
              onChange={(e) => setDamages(e.target.value)}
              style={fieldStyle}
              min="0"
              step="0.01"
            />

            <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <PrimaryButton onClick={handleSave}>Save & Preview</PrimaryButton>
              <SecondaryButton href={ROUTES.dashboard}>Back</SecondaryButton>
            </div>
          </>
        )}
      </Container>

      <Footer />
    </main>
  );
}


