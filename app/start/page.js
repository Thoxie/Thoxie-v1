// Path: /app/start/page.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";

import { ROUTES } from "../_config/routes";
import CA_JURISDICTION from "../_config/jurisdictions/ca";
import { createEmptyCase } from "../_schemas/caseSchema";
import { CaseRepository } from "../_repository/caseRepository";

export default function StartPage() {
  const router = useRouter();

  // Locked to CA for v1 scaffold; multi-state comes via config later.
  const [stateCode] = useState("CA");
  const [county, setCounty] = useState("");
  const [courtId, setCourtId] = useState("");

  const [role, setRole] = useState("plaintiff");
  const [category, setCategory] = useState("Money owed");

  const countyOptions = useMemo(() => {
    if (stateCode !== "CA") return [];
    return CA_JURISDICTION.counties.map((c) => c.county);
  }, [stateCode]);

  const courtOptions = useMemo(() => {
    if (!county) return [];
    const found = CA_JURISDICTION.counties.find((c) => c.county === county);
    return found?.courts ?? [];
  }, [county]);

  const selectedCourt = useMemo(() => {
    if (!courtId) return null;
    return courtOptions.find((c) => c.courtId === courtId) ?? null;
  }, [courtId, courtOptions]);

  function reset() {
    setCounty("");
    setCourtId("");
    setRole("plaintiff");
    setCategory("Money owed");
  }

  function canCreate() {
    return stateCode === "CA" && !!county && !!courtId && !!role && !!category && !!selectedCourt;
  }

  function handleCreateCase() {
    if (!canCreate()) return;

    const jurisdiction = {
      state: "CA",
      county,
      courtId: selectedCourt.courtId,
      courtName: selectedCourt.name,
      courtAddress: selectedCourt.address
    };

    const newCase = createEmptyCase(jurisdiction, role, category);
    CaseRepository.save(newCase);

    router.push(ROUTES.dashboard);
  }

  const selectStyle = {
    width: "100%",
    maxWidth: "820px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    background: "#fff",
    marginTop: "8px",
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
        <PageTitle>Start a California Small Claims Case</PageTitle>

        <TextBlock>
          Jurisdiction selection is required first. This app provides general information and drafting assistance — not legal advice.
        </TextBlock>

        <div style={{ marginTop: "10px" }}>
          <SecondaryButton href={ROUTES.dashboard}>Go to Dashboard</SecondaryButton>

          <button
            type="button"
            onClick={reset}
            style={{
              marginLeft: "12px",
              border: "1px solid #ddd",
              background: "#fff",
              borderRadius: "12px",
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 800
            }}
          >
            Reset
          </button>
        </div>

        {/* Jurisdiction (Required) */}
        <div style={labelStyle}>State</div>
        <div style={{ maxWidth: "820px", marginTop: "6px", color: "#444" }}>
          California (locked for v1)
        </div>

        <div style={labelStyle}>County (CA)</div>
        <select
          value={county}
          onChange={(e) => {
            setCounty(e.target.value);
            setCourtId("");
          }}
          style={selectStyle}
        >
          <option value="">Select a county…</option>
          {countyOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div style={labelStyle}>Court (auto-derived from county)</div>
        <select
          value={courtId}
          onChange={(e) => setCourtId(e.target.value)}
          style={selectStyle}
          disabled={!county}
        >
          <option value="">{county ? "Select a court…" : "Select a county first…"}</option>
          {courtOptions.map((crt) => (
            <option key={crt.courtId} value={crt.courtId}>
              {crt.name}
            </option>
          ))}
        </select>

        {selectedCourt && (
          <div
            style={{
              maxWidth: "820px",
              marginTop: "10px",
              padding: "12px 14px",
              border: "1px solid #e6e6e6",
              background: "#fafafa",
              borderRadius: "12px"
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: "6px" }}>{selectedCourt.name}</div>
            <div style={{ color: "#333" }}>{selectedCourt.address}</div>
            <div style={{ marginTop: "8px", fontSize: "13px" }}>
              Clerk / Court site:{" "}
              <a href={selectedCourt.clerkUrl} target="_blank" rel="noreferrer">
                {selectedCourt.clerkUrl}
              </a>
            </div>
          </div>
        )}

        {/* Case Setup */}
        <div style={labelStyle}>Role</div>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={selectStyle}>
          <option value="plaintiff">Plaintiff (starting a claim)</option>
          <option value="defendant">Defendant (responding to a claim)</option>
        </select>

        <div style={labelStyle}>Case Category</div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
          <option value="Money owed">Money owed</option>
          <option value="Property damage">Property damage</option>
          <option value="Security deposit">Security deposit</option>
          <option value="Services not rendered">Services not rendered</option>
          <option value="Other">Other</option>
        </select>

        <div style={{ marginTop: "18px" }}>
          <PrimaryButton
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleCreateCase();
            }}
            style={{
              opacity: canCreate() ? 1 : 0.5,
              pointerEvents: canCreate() ? "auto" : "none"
            }}
          >
            Create Case
          </PrimaryButton>
        </div>

        <div style={{ marginTop: "18px", fontSize: "13px", color: "#666", maxWidth: "820px" }}>
          Note: cases are currently stored locally in your browser (localStorage). We’ll switch this repository to Vercel Postgres later without changing the UI flow.
        </div>
      </Container>

      <Footer />
    </main>
  );
}

