// Path: /app/intake-wizard/page.js
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

export default function IntakeWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [error, setError] = useState("");

  // form fields
  const [plaintiff, setPlaintiff] = useState("");
  const [defendant, setDefendant] = useState("");
  const [facts, setFacts] = useState("");
  const [damages, setDamages] = useState("0");

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
  }, [caseId]);

  const headerLine = useMemo(() => {
    if (!c) return "";
    const county = c.jurisdiction?.county || "Unknown County";
    const role = c.role === "defendant" ? "Defendant" : "Plaintiff";
    return `${county} County — ${role} — ${c.category || "Uncategorized"}`;
  }, [c]);

  function handleSave() {
    if (!c) return;

    const damagesNum = Number(damages);
    if (Number.isNaN(damagesNum) || damagesNum < 0) {
      alert("Damages must be a valid non-negative number.");
      return;
    }

    const updated = {
      ...c,
      parties: {
        ...(c.parties || {}),
        plaintiff: plaintiff.trim(),
        defendant: defendant.trim()
      },
      facts: facts.trim(),
      damages: damagesNum
    };

    CaseRepository.save(updated);
    router.push(`${ROUTES.preview}?caseId=${encodeURIComponent(updated.id)}`);
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Intake Wizard (Minimal Editor)</PageTitle>

        <TextBlock>
          This is a scaffold intake editor: it saves structured case data to your local browser storage. Later we’ll expand this into a guided, step-by-step wizard.
        </TextBlock>

        {headerLine && (
          <div style={{ marginTop: "10px", color: "#444", fontWeight: 800 }}>
            {headerLine}
          </div>
        )}

        {error ? (
          <div style={{ marginTop: "14px", padding: "14px", border: "1px solid #eee", borderRadius: "12px" }}>
            <div style={{ fontWeight: 900 }}>Cannot load case</div>
            <div style={{ marginTop: "6px", color: "#555" }}>{error}</div>
            <div style={{ marginTop: "12px" }}>
              <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
            </div>
          </div>
        ) : !c ? (
          <div style={{ marginTop: "14px", color: "#555" }}>Loading…</div>
        ) : (
          <div style={{ marginTop: "16px", maxWidth: "920px" }}>
            <Field label="Plaintiff name" value={plaintiff} onChange={setPlaintiff} placeholder="e.g., Jane Doe" />
            <Field label="Defendant name" value={defendant} onChange={setDefendant} placeholder="e.g., ABC Plumbing LLC" />

            <div style={{ marginTop: "14px", fontWeight: 900, fontSize: "13px" }}>What happened? (facts)</div>
            <textarea
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              placeholder="Explain what happened in plain English. Keep it factual and chronological."
              style={{
                width: "100%",
                minHeight: "140px",
                marginTop: "8px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                fontSize: "14px",
                lineHeight: 1.6
              }}
            />

            <Field
              label="Damages (amount you’re asking for)"
              value={damages}
              onChange={setDamages}
              placeholder="e.g., 3500"
              type="number"
            />

            <div style={{ marginTop: "18px" }}>
              <PrimaryButton
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                Save & Preview Packet
              </PrimaryButton>

              <SecondaryButton href={ROUTES.dashboard} style={{ marginLeft: "12px" }}>
                Back to Dashboard
              </SecondaryButton>
            </div>
          </div>
        )}
      </Container>

      <Footer />
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginTop: "14px" }}>
      <div style={{ fontWeight: 900, fontSize: "13px" }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          marginTop: "8px",
          padding: "10px 12px",
          borderRadius: "10px",
          border: "1px solid #ddd",
          fontSize: "14px"
        }}
      />
    </div>
  );
}
