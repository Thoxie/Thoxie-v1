// Path: /app/case-dashboard/CaseHub.js
"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import EmptyState from "../_components/EmptyState";
import TextBlock from "../_components/TextBlock";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

import NextActionsCard from "./NextActionsCard";

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState("");

  async function refreshDocs(id) {
    try {
      const list = await DocumentRepository.listByCaseId(id);
      setDocs(Array.isArray(list) ? list : []);
    } catch {
      setDocs([]);
    }
  }

  useEffect(() => {
    setErr("");
    const c = CaseRepository.getById(caseId);
    setCaseRecord(c || null);
    refreshDocs(caseId);
  }, [caseId]);

  const docCount = docs.length;

  const subtitle = useMemo(() => {
    const county = caseRecord?.jurisdiction?.county || "";
    const court = caseRecord?.jurisdiction?.courtName || "";
    if (county || court) return `${county || "CA"} · ${court || "Court"}`;
    return `Case ID: ${caseId}`;
  }, [caseId, caseRecord]);

  if (!caseRecord) {
    return (
      <Container>
        <div style={{ padding: "18px 0" }}>
          <PageTitle>Case Hub</PageTitle>

          <EmptyState
            title="Case not found"
            description="This caseId does not exist in your local storage."
            actions={
              <SecondaryButton href={ROUTES.dashboard}>
                Back to Case List
              </SecondaryButton>
            }
          />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <PageTitle>Case Hub</PageTitle>
        <div style={{ fontWeight: 900, color: "#555", marginTop: "-6px" }}>
          {subtitle}
        </div>

        {err ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <PrimaryButton href={`${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}`}>
            Documents ({docCount})
          </PrimaryButton>

          <SecondaryButton href={`${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`}>
            Edit Intake
          </SecondaryButton>

          <SecondaryButton href={`${ROUTES.filingGuidance}?caseId=${encodeURIComponent(caseId)}`}>
            Filing Guidance
          </SecondaryButton>

          <SecondaryButton href={`${ROUTES.keyDates}?caseId=${encodeURIComponent(caseId)}`}>
            Key Dates
          </SecondaryButton>

          <SecondaryButton href={ROUTES.dashboard}>
            Back to Case List
          </SecondaryButton>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <NextActionsCard caseRecord={caseRecord} docs={docs} caseId={caseId} />

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Case Summary</div>

            <div style={{ lineHeight: 1.7, color: "#333" }}>
              <div>
                <b>Plaintiff:</b> {caseRecord.parties?.plaintiff || "—"}
              </div>
              <div>
                <b>Defendant:</b> {caseRecord.parties?.defendant || "—"}
              </div>
              <div>
                <b>Damages:</b>{" "}
                {typeof caseRecord.damages === "number"
                  ? `$${caseRecord.damages.toLocaleString()}`
                  : "—"}
              </div>
              <div>
                <b>Case Number:</b> {caseRecord.caseNumber || "—"}
              </div>
              <div>
                <b>Hearing:</b>{" "}
                {caseRecord.hearingDate ? caseRecord.hearingDate : "—"}{" "}
                {caseRecord.hearingTime ? `at ${caseRecord.hearingTime}` : ""}
              </div>
            </div>

            <TextBlock
              label="Narrative (facts)"
              value={caseRecord.facts}
              placeholder="No narrative yet. Add a short narrative in Intake Wizard."
            />
          </div>
        </div>
      </div>
    </Container>
  );
}

