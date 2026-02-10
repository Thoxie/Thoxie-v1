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

      <Container style={{ flex: 1 }}>
        <PageTitle>Intake Wizard</PageTitle>

        <TextBlock>
          This intake editor stores structured case data locally. Later versions will guide
          users step-by-step.
        </TextBlock>

        {headerLine && <div style={{ fontWeight: 800 }}>{headerLine}</div>}

        {error ? (
          <div>{error}</div>
        ) : !c ? (
          <div>Loading…</div>
        ) : (
          <>
            <label>Plaintiff</label>
            <input value={plaintiff} onChange={(e) => setPlaintiff(e.target.value)} />

            <label>Defendant</label>
            <input value={defendant} onChange={(e) => setDefendant(e.target.value)} />

            <label>Facts</label>
            <textarea value={facts} onChange={(e) => setFacts(e.target.value)} />

            <label>Damages</label>
            <input
              type="number"
              value={damages}
              onChange={(e) => setDamages(e.target.value)}
            />

            <PrimaryButton onClick={handleSave}>Save & Preview</PrimaryButton>
            <SecondaryButton href={ROUTES.dashboard}>Back</SecondaryButton>
          </>
        )}
      </Container>

      <Footer />
    </main>
  );
}



