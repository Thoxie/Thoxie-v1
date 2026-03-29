// PATH: /app/start/page.js
// DIRECTORY: /app/start
// FILE: page.js
// ACTION: FULL OVERWRITE
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const saveInFlightRef = useRef(false);

  const [existingCase, setExistingCase] = useState(null);
  const [errorText, setErrorText] = useState("");

  const [stateCode] = useState("CA");
  const [county, setCounty] = useState("");
  const [courtId, setCourtId] = useState("");

  const [role, setRole] = useState("plaintiff");
  const [category, setCategory] = useState("Money owed");

  useEffect(() => {
    let cancelled = false;

    async function hydrateExistingCase() {
      try {
        const active = CaseRepository.getActive();
        if (!active?.id) return;

        const loaded = (await CaseRepository.loadById(active.id)) || active;
        if (!loaded || cancelled) return;

        setExistingCase(loaded);
        setErrorText("");

        const j = loaded.jurisdiction || {};
        if (j.county) setCounty(j.county);
        if (j.courtId) setCourtId(j.courtId);

        if (loaded.role) setRole(String(loaded.role));
        if (loaded.category) setCategory(String(loaded.category));
      } catch (err) {
        if (cancelled) return;

        console.error("START PAGE LOAD ERROR:", err);
        setExistingCase(null);
        setErrorText(err?.message || "Could not load the active case.");
      }
    }

    hydrateExistingCase();

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (existingCase?.id) {
      const ok = window.confirm(
        "Reset will clear the current case and draft from this browser so you can create a different case here. Continue?"
      );
      if (!ok) return;

      try {
        CaseRepository.delete(existingCase.id);
      } catch {
        // ignore
      }

      setExistingCase(null);
    }

    setErrorText("");
    setCounty("");
    setCourtId("");
    setRole("plaintiff");
    setCategory("Money owed");
  }

  function canSave() {
    return stateCode === "CA" && !!county && !!courtId && !!role && !!category && !!selectedCourt;
  }

  async function handleCreateOrUpdate() {
    if (!canSave() || saveInFlightRef.current) return;

    const jurisdiction = {
      state: "CA",
      county,
      courtId: selectedCourt.courtId,
      courtName: selectedCourt.name,
      courtAddress: selectedCourt.address,
      clerkUrl: selectedCourt.clerkUrl,
    };

    saveInFlightRef.current = true;
    setErrorText("");

    try {
      if (existingCase?.id) {
        const next = {
          ...existingCase,
          role,
          category,
          jurisdiction: {
            ...(existingCase.jurisdiction || {}),
            ...jurisdiction,
          },
          claim: {
            ...(existingCase.claim || {}),
            type: category,
          },
        };

        const saved = await CaseRepository.save(next);
        router.push(`${ROUTES.dashboard}?caseId=${encodeURIComponent(saved.id)}`);
        return;
      }

      const baseCase = createEmptyCase();
      const newCase = {
        ...baseCase,
        role,
        category,
        jurisdiction: {
          ...(baseCase.jurisdiction || {}),
          ...jurisdiction,
        },
        claim: {
          ...(baseCase.claim || {}),
          type: category,
        },
      };

      const saved = await CaseRepository.save(newCase);
      router.push(`${ROUTES.dashboard}?caseId=${encodeURIComponent(saved.id)}`);
    } catch (err) {
      const message = err?.message || "Could not create/update the case.";
      console.error("START PAGE SAVE ERROR:", err);
      setErrorText(message);
      alert(message);
    } finally {
      saveInFlightRef.current = false;
    }
  }

  const selectStyle = {
    width: "100%",
    maxWidth: "820px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    background: "#fff",
    marginTop: "8px",
    fontSize: "14px",
  };

  const labelStyle = {
    marginTop: "14px",
    fontWeight: 900,
    fontSize: "13px",
  };

  const dashboardHref = existingCase?.id
    ? `${ROUTES.dashboard}?caseId=${encodeURIComponent(existingCase.id)}`
    : ROUTES.dashboard;

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Start a California Small Claims Case</PageTitle>

        <TextBlock>
          Jurisdiction selection is required first. THOXIE saves your case to the beta server and keeps this browser linked to it. General information and drafting assistance only — not legal advice.
        </TextBlock>

        <div style={{ marginTop: "10px" }}>
          <SecondaryButton href={dashboardHref}>Go to Dashboard</SecondaryButton>

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
              fontWeight: 800,
            }}
          >
            Reset
          </button>
        </div>

        {errorText ? (
          <div
            style={{
              marginTop: "12px",
              maxWidth: "820px",
              padding: "12px 14px",
              border: "1px solid #f0b5b5",
              background: "#fff5f5",
              borderRadius: "12px",
              color: "#8a0000",
              fontSize: "13px",
            }}
          >
            {errorText}
          </div>
        ) : null}

        {existingCase?.id ? (
          <div style={{ marginTop: "12px", fontSize: "13px", color: "#333", maxWidth: "820px" }}>
            <b>Single-case beta mode:</b> this browser is already linked to one case. This screen updates that case.
          </div>
        ) : null}

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

        {selectedCourt ? (
          <div
            style={{
              maxWidth: "820px",
              marginTop: "10px",
              padding: "12px 14px",
              border: "1px solid #e6e6e6",
              background: "#fafafa",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: "6px" }}>{selectedCourt.name}</div>
            <div style={{ color: "#333" }}>{selectedCourt.address}</div>
            {selectedCourt.clerkUrl ? (
              <div style={{ marginTop: "8px", fontSize: "13px" }}>
                Clerk / Court site:{" "}
                <a href={selectedCourt.clerkUrl} target="_blank" rel="noreferrer">
                  {selectedCourt.clerkUrl}
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

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
              handleCreateOrUpdate();
            }}
            style={{
              opacity: canSave() ? 1 : 0.5,
              pointerEvents: canSave() ? "auto" : "none",
            }}
          >
            {existingCase?.id ? "Save" : "Create Case"}
          </PrimaryButton>
        </div>

        <div style={{ marginTop: "18px", fontSize: "13px", color: "#666", maxWidth: "820px" }}>
          Note: cases are saved to the beta server, and this browser remembers the active case and draft state. Nothing is filed automatically.
        </div>
      </Container>

      <Footer />
    </main>
  );
}
