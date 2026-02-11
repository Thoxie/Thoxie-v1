// Path: /app/intake-wizard/IntakeWizardClient.js
"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function IntakeWizardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const [plaintiff, setPlaintiff] = useState("");
  const [defendant, setDefendant] = useState("");
  const [facts, setFacts] = useState("");
  const [damages, setDamages] = useState("0");

  // Filing lifecycle fields
  const [status, setStatus] = useState("draft");
  const [caseNumber, setCaseNumber] = useState("");
  const [filedDate, setFiledDate] = useState(""); // YYYY-MM-DD
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
      setError("Case not found in localStorage. It may have been deleted or you’re in a different browser.");
      setC(null);
      return;
    }

    setError("");
    setC(found);

    setPlaintiff(found.parties?.plaintiff || "");
    setDefendant(found.parties?.defendant || "");
    setFacts(found.facts || "");
    setDamages(String(found.damages ?? 0));

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

  function buildUpdatedCase() {
    if (!c) return null;

    const damagesNum = validateDamages();
    if (damagesNum === null) return null;

    return {
      ...c,
      parties: {
        ...(c.parties || {}),
        plaintiff: plaintiff.trim(),
        defendant: defendant.trim()
      },
      facts: facts.trim(),
      damages: damagesNum,

      status,
      caseNumber: caseNumber.trim(),
      filedDate: filedDate.trim(),
      hearingDate: hearingDate.trim(),
      hearingTime: hearingTime.trim()
    };
  }

  function showSaved(msg) {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(""), 2500);
  }

  function handleSave() {
    const next = buildUpdatedCase();
    if (!next) return;
    CaseRepository.save(next);
    setC(next);
    showSaved("Saved.");
  }

  function handleBack() {
    router.push(ROUTES.dashboard);
  }

  const card = {
    border: "1px solid #e6e6e6",
    borderRadius: "12px",
    padding: "14px 16px",
    background: "#fff",
    maxWidth: "920px"
  };

  if (error) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header />
        <Container style={{ flex: 1 }}>
          <PageTitle>Edit Intake</PageTitle>
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
        <PageTitle>Edit Intake</PageTitle>

        <TextBlock>
          Edit the core case information used throughout the app. This is stored locally in your browser (localStorage).
        </TextBlock>

        {statusMsg ? (
          <div
            style={{
              marginTop: "10px",
              marginBottom: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "#e8f5e9",
              border: "1px solid #c8e6c9",
              fontWeight: 800,
              maxWidth: "920px"
            }}
          >
            {statusMsg}
          </div>
        ) : null}

        {c ? (
          <div style={{ ...card, marginTop: "12px" }}>
            <div style={{ fontWeight: 900 }}>{headerLine}</div>
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#555" }}>
              Case ID: <code>{c.id}</code>
            </div>
          </div>
        ) : null}

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>Parties</div>

          <label style={labelStyle}>Plaintiff</label>
          <input
            value={plaintiff}
            onChange={(e) => setPlaintiff(e.target.value)}
            style={inputStyle}
            placeholder="Full name"
          />

          <label style={labelStyle}>Defendant</label>
          <input
            value={defendant}
            onChange={(e) => setDefendant(e.target.value)}
            style={inputStyle}
            placeholder="Full name"
          />
        </div>

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>Case Details</div>

          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="draft">draft</option>
            <option value="filed">filed</option>
            <option value="served">served</option>
            <option value="hearing_set">hearing_set</option>
            <option value="resolved">resolved</option>
          </select>

          <label style={labelStyle}>Case Number</label>
          <input
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            style={inputStyle}
            placeholder="e.g., 25SC123456"
          />

          <label style={labelStyle}>Filed Date</label>
          <input value={filedDate} onChange={(e) => setFiledDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />

          <label style={labelStyle}>Hearing Date</label>
          <input value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />

          <label style={labelStyle}>Hearing Time</label>
          <input value={hearingTime} onChange={(e) => setHearingTime(e.target.value)} style={inputStyle} placeholder="HH:MM (e.g., 13:30)" />

          <label style={labelStyle}>Damages</label>
          <input value={damages} onChange={(e) => setDamages(e.target.value)} style={inputStyle} placeholder="0" />
        </div>

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>Facts (Draft Narrative)</div>
          <textarea
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "920px",
              minHeight: "160px",
              borderRadius: "12px",
              border: "1px solid #ddd",
              padding: "10px 12px",
              fontSize: "13px",
              lineHeight: 1.6
            }}
            placeholder="Write the draft facts here…"
          />
          <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <PrimaryButton
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              Save
            </PrimaryButton>

            <SecondaryButton
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleBack();
              }}
            >
              Back to Dashboard
            </SecondaryButton>
          </div>
        </div>
      </Container>

      <Footer />
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginTop: "12px",
  fontWeight: 900,
  fontSize: "13px"
};

const inputStyle = {
  width: "100%",
  maxWidth: "820px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  background: "#fff",
  marginTop: "6px",
  fontSize: "14px"
};

