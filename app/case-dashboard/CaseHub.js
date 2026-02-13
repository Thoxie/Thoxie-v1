// Path: /app/case-dashboard/CaseHub.js
"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../_components/Container";
import EmptyState from "../_components/EmptyState";
import PageTitle from "../_components/PageTitle";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

/* Draft support */
import { DraftRepository } from "../_repository/draftRepository";
import { generateSmallClaimsDraft } from "../_lib/draftGenerator";
import { createDraftRecord } from "../_schemas/draftSchema";

/* NEW — Draft list UI */
import DraftsCard from "./_components/DraftsCard";

import NextActionsCard from "./NextActionsCard";
import HubHeader from "./_components/HubHeader";
import CaseSummaryCard from "./_components/CaseSummaryCard";

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

  async function handleGenerateDraft() {
    if (!caseRecord) return;

    try {
      const draftData = generateSmallClaimsDraft(caseRecord);

      const draftRecord = createDraftRecord({
        caseId,
        ...draftData,
      });

      await DraftRepository.create(draftRecord);

      window.location.href = `/draft-preview?draftId=${draftRecord.draftId}`;
    } catch {
      setErr("Failed to generate draft.");
    }
  }

  useEffect(() => {
    setErr("");
    try {
      const c = CaseRepository.getById(caseId);
      setCaseRecord(c || null);
    } catch {
      setCaseRecord(null);
    }
    refreshDocs(caseId);
  }, [caseId]);

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
            message="This caseId does not exist in your local storage."
            ctaHref={ROUTES.dashboard}
            ctaLabel="Back to Case List"
          />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <HubHeader
          title="Case Hub"
          subtitle={subtitle}
          caseId={caseId}
          docCount={docs.length}
          routes={ROUTES}
        />

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

        <div style={{ marginTop: 16 }}>
          <button onClick={handleGenerateDraft}>
            Generate Draft
          </button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <DraftsCard caseId={caseId} />
          <NextActionsCard caseRecord={caseRecord} docs={docs} />
          <CaseSummaryCard caseRecord={caseRecord} />
        </div>
      </div>
    </Container>
  );
}
