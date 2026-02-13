// Path: /app/case-dashboard/CaseHub.js
"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../_components/Container";
import EmptyState from "../_components/EmptyState";
import PageTitle from "../_components/PageTitle";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DraftRepository } from "../_repository/draftRepository";
import { generateSmallClaimsDraft } from "../_lib/draftGenerator";
import { createDraftRecord } from "../_schemas/draftSchema";

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);

  useEffect(() => {
    loadCase();
  }, [caseId]);

  async function loadCase() {
    const record = await CaseRepository.get(caseId);
    setCaseRecord(record);
  }

  async function handleGenerateDraft() {
    if (!caseRecord) return;

    const draftData = generateSmallClaimsDraft(caseRecord);

    const draftRecord = createDraftRecord({
      caseId,
      ...draftData,
    });

    await DraftRepository.create(draftRecord);

    window.location.href = `/draft-preview?draftId=${draftRecord.draftId}`;
  }

  if (!caseRecord) return <EmptyState title="Case not found" />;

  return (
    <Container>
      <PageTitle>Case Hub</PageTitle>

      <div style={{ marginTop: 24 }}>
        <button onClick={handleGenerateDraft}>
          Generate Draft
        </button>
      </div>
    </Container>
  );
}
