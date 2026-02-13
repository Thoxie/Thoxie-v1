// Path: /app/intake-wizard/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import IntakeWizardClient from "./IntakeWizardClient";
import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { CaseSchema } from "../_schemas/caseSchema";

function IntakeWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId");

  const initialCase = useMemo(() => {
    if (!caseId) return null;
    return CaseRepository.getById(caseId);
  }, [caseId]);

  function handleComplete(payload) {
    const now = new Date().toISOString();
    const id =
      caseId ||
      initialCase?.id ||
      payload?.caseId ||
      (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `case-${Date.now()}`);

    const record = {
      id,
      createdAt: initialCase?.createdAt || now,
      updatedAt: now,

      status: "draft",
      role: payload?.role || initialCase?.role || "plaintiff",
      category: payload?.claimType || initialCase?.category || "",

      jurisdiction: {
        county: payload?.county || initialCase?.jurisdiction?.county || "",
        courtName: payload?.courtName || initialCase?.jurisdiction?.courtName || "",
        courtAddress: payload?.courtAddress || initialCase?.jurisdiction?.courtAddress || "",
        clerkUrl: initialCase?.jurisdiction?.clerkUrl || "",
        notes: initialCase?.jurisdiction?.notes || "",
      },

      parties: {
        plaintiff: payload?.plaintiffName || initialCase?.parties?.plaintiff || "",
        defendant: payload?.defendantName || initialCase?.parties?.defendant || "",

        // Persist fields already collected by IntakeWizardClient
        plaintiffPhone: payload?.plaintiffPhone || initialCase?.parties?.plaintiffPhone || "",
        plaintiffEmail: payload?.plaintiffEmail || initialCase?.parties?.plaintiffEmail || "",
        plaintiffAddress: payload?.plaintiffAddress || initialCase?.parties?.plaintiffAddress || "",

        defendantPhone: payload?.defendantPhone || initialCase?.parties?.defendantPhone || "",
        defendantEmail: payload?.defendantEmail || initialCase?.parties?.defendantEmail || "",
        defendantAddress: payload?.defendantAddress || initialCase?.parties?.defendantAddress || "",
      },

      damages:
        typeof payload?.amountDemanded === "number"
          ? payload.amountDemanded
          : payload?.amountDemanded || initialCase?.damages || "",

      // Persist structured claim fields (optional)
      claim: {
        amount:
          typeof payload?.amountDemanded === "number"
            ? payload.amountDemanded
            : payload?.amountDemanded || initialCase?.claim?.amount || "",
        reason: payload?.claimType || initialCase?.claim?.reason || "",
        where: payload?.county || initialCase?.claim?.where || "",
        incidentDate: payload?.incidentDate || initialCase?.claim?.incidentDate || "",
      },

      facts: payload?.narrative || initialCase?.facts || "",

      caseNumber: payload?.caseNumber || initialCase?.caseNumber || "",
      filedDate: initialCase?.filedDate || "",
      hearingDate: payload?.hearingDate || initialCase?.hearingDate || "",
      hearingTime: payload?.hearingTime || initialCase?.hearingTime || "",

      courtNoticeText: initialCase?.courtNoticeText || "",
      factsItems: initialCase?.factsItems || [],
    };

    const parsed = CaseSchema.safeParse(record);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error("CaseSchema validation failed", parsed.error);
      alert("Could not save the case: invalid data structure. Please try again.");
      return;
    }

    CaseRepository.save(parsed.data);
    CaseRepository.clearDraft(id);

    router.push(`${ROUTES.documents}?caseId=${encodeURIComponent(id)}`);
  }

  return (
    <IntakeWizardClient
      initialCase={initialCase}
      caseId={caseId}
      onComplete={handleComplete}
    />
  );
}

export default function IntakeWizardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <IntakeWizardInner />
    </Suspense>
  );
}

