// Path: /app/key-dates/page.js
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

export default function KeyDatesPage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <KeyDatesInner />
    </Suspense>
  );
}

function KeyDatesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [error, setError] = useState("");

  const [filedDate, setFiledDate] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [hearingTime, setHearingTime] = useState("");

  const [serviceDeadline, setServiceDeadline] = useState("");
  const [dateServed, setDateServed] = useState("");

  const [trialDate, setTrialDate] = useState("");
  const [trialTime, setTrialTime] = useState("");

  const [depositionDate, setDepositionDate] = useState("");
  const [depositionTime, setDepositionTime] = useState("");

  const [otherDateLabel, setOtherDateLabel] = useState("");
  const [otherDate, setOtherDate] = useState("");
  const [otherTime, setOtherTime] = useState("");

  useEffect(() => {
    if (!caseId) {
      setError("Missing caseId. Return to the dashboard and click “Key Dates.”");
      setC(null);
      return;
    }

    const found = CaseRepository.getById(caseId);
    if (!found) {
      setError("Case not found in this browser. Return to the dashboard.");
      setC(null);
      return;
    }

    setError("");
    setC(found);

    setFiledDate(found.filedDate || "");
    setHearingDate(found.hearingDate || "");
    setHearingTime(found.hearingTime || "");

    setServiceDeadline(found.serviceDeadline || "");
    setDateServed(found.dateServed || "");

    setTrialDate(found.trialDate || "");
    setTrialTime(found.trialTime || "");

    setDepositionDate(found.depositionDate || "");
    setDepositionTime(found.depositionTime || "");

    setOtherDateLabel(found.otherDateLabel || "");
    setOtherDate(found.otherDate || "");
    setOtherTime(found.otherTime || "");
  }, [caseId]);

  const headerLine = useMemo(() => {
    if (!c) return "";
    const county = c.jurisdiction?.county || "Unknown County";
    const role = c.role === "defendant" ? "Defendant" : "Plaintiff";
    return `${county} County — ${role} — ${c.category || "Uncategorized"}`;
  }, [c]);

  function handleSave() {
    if (!c) return;

    const updated = {
      ...c,
      filedDate: filedDate.trim(),
      hearingDate: hearingDate.trim(),
      hearingTime: hearingTime.trim(),

      serviceDeadline: serviceDeadline.trim(),
      dateServed: dateServed.trim(),

      trialDate: trialDate.trim(),
      trialTime: trialTime.trim(),

      depositionDate: depositionDate.trim(),
      depositionTime: depositionTime.trim(),

      otherDateLabel: otherDateLabel.trim(),
      otherDate: otherDate.trim(),
      otherTime: otherTime.trim()
    };

    CaseRepository.save(updated);
    router.push(ROUTES.dashboard);
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

  const sectionTitle = {
    marginTop: "18px",
    fontWeight: 900,
    fontSize: "14px"
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Key Dates</PageTitle>

        <TextBlock>
          Track important deadlines and hearing dates for this case. This is case management support — not legal advice.
        </TextBlock>

        {headerLine && <div style={{ fontWeight: 900, marginTop: "6px" }}>{headerLine}</div>}

        {error ? (
          <div style={{ marginTop: "14px", color: "#b00020", fontWeight: 800 }}>{error}</div>
        ) : !c ? (
          <div style={{ marginTop: "14px" }}>Loading…</div>
        ) : (
          <>
            <div style={sectionTitle}>Filing / Hearing</div>

            <div style={labelStyle}>Filed Date</div>
            <input type="date" value={filedDate} onChange={(e) => setFiledDate(e.target.value)} style={fieldStyle} />

            <div style={labelStyle}>Hearing Date</div>
            <input type="date" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} style={fieldStyle} />

            <div style={labelStyle}>Hearing Time</div>
            <input type="time" value={hearingTime} onChange={(e) => setHearingTime(e.target.value)} style={fieldStyle} />

            <div style={sectionTitle}>Service of Process</div>

            <div style={labelStyle}>Service Deadline</div>
            <input
              type="date"
              value={serviceDeadline}
              onChange={(e) => setServiceDeadline(e.target.value)}
              style={fieldStyle}
            />

            <div style={labelStyle}>Date Served</div>
            <input type="date" value={dateServed} onChange={(e) => setDateServed(e.target.value)} style={fieldStyle} />

            <div style={sectionTitle}>Trial / Deposition (future-proof)</div>

            <div style={labelStyle}>Trial Date</div>
            <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} style={fieldStyle} />

            <div style={labelStyle}>Trial Time</div>
            <input type="time" value={trialTime} onChange={(e) => setTrialTime(e.target.value)} style={fieldStyle} />

            <div style={labelStyle}>Deposition Date</div>
            <input
              type="date"
              value={depositionDate}
              onChange={(e) => setDepositionDate(e.target.value)}
              style={fieldStyle}
            />

            <div style={labelStyle}>Deposition Time</div>
            <input
              type="time"
              value={depositionTime}
              onChange={(e) => setDepositionTime(e.target.value)}
              style={fieldStyle}
            />

            <div style={sectionTitle}>Other Date</div>

            <div style={labelStyle}>Label</div>
            <input
              value={otherDateLabel}
              onChange={(e) => setOtherDateLabel(e.target.value)}
              style={fieldStyle}
              placeholder='Example: "Continuance deadline" or "Evidence exchange due"'
            />

            <div style={labelStyle}>Date</div>
            <input type="date" value={otherDate} onChange={(e) => setOtherDate(e.target.value)} style={fieldStyle} />

            <div style={labelStyle}>Time</div>
            <input type="time" value={otherTime} onChange={(e) => setOtherTime(e.target.value)} style={fieldStyle} />

            <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <PrimaryButton onClick={handleSave}>Save Dates</PrimaryButton>
              <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
            </div>
          </>
        )}
      </Container>

      <Footer />
    </main>
  );
}

