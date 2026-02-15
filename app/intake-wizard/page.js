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

  function parseNames(val) {
    const s = (val == null ? "" : String(val)).replace(/,/g, "\n");
    return s
      .split(/\r?\n/)
      .map((x) => String(x).trim())
      .filter(Boolean);
  }

  function toYesNoBool(val) {
    const s = (val == null ? "" : String(val)).trim().toLowerCase();
    if (s === "yes" || s === "true") return true;
    if (s === "no" || s === "false") return false;
    return undefined;
  }

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
        state: "CA",
        county: payload?.county || initialCase?.jurisdiction?.county || "",
        courtId: payload?.courtId || initialCase?.jurisdiction?.courtId || "",
        courtName: payload?.courtName || initialCase?.jurisdiction?.courtName || "",
        courtAddress: payload?.courtAddress || initialCase?.jurisdiction?.courtAddress || "",
        clerkUrl: initialCase?.jurisdiction?.clerkUrl || "",
        notes: initialCase?.jurisdiction?.notes || "",
      },

      parties: {
        plaintiff: payload?.plaintiffName || initialCase?.parties?.plaintiff || "",
        defendant: payload?.defendantName || initialCase?.parties?.defendant || "",

        plaintiffPhone: payload?.plaintiffPhone || initialCase?.parties?.plaintiffPhone || "",
        plaintiffEmail: payload?.plaintiffEmail || initialCase?.parties?.plaintiffEmail || "",
        plaintiffAddress: payload?.plaintiffAddress || initialCase?.parties?.plaintiffAddress || "",

        defendantPhone: payload?.defendantPhone || initialCase?.parties?.defendantPhone || "",
        defendantEmail: payload?.defendantEmail || initialCase?.parties?.defendantEmail || "",
        defendantAddress: payload?.defendantAddress || initialCase?.parties?.defendantAddress || "",

        additionalPlaintiffs: parseNames(payload?.additionalPlaintiffs),
        additionalDefendants: parseNames(payload?.additionalDefendants),
      },

      damages:
        typeof payload?.amountDemanded === "number"
          ? payload.amountDemanded
          : payload?.amountDemanded || initialCase?.damages || "",

      claim: {
        amount:
          typeof payload?.amountDemanded === "number"
            ? payload.amountDemanded
            : payload?.amountDemanded || initialCase?.claim?.amount || "",
        reason: payload?.claimType || initialCase?.claim?.reason || "",
        where: payload?.county || initialCase?.claim?.where || "",
        incidentDate: payload?.incidentDate || initialCase?.claim?.incidentDate || "",

        plaintiffUsesDba:
          typeof toYesNoBool(payload?.plaintiffUsesDba) === "boolean"
            ? toYesNoBool(payload?.plaintiffUsesDba)
            : initialCase?.claim?.plaintiffUsesDba,
      },

      service: {
        method: payload?.serviceMethod || initialCase?.service?.method || "",
      },

      feeWaiver: {
        requested:
          typeof toYesNoBool(payload?.feeWaiverRequested) === "boolean"
            ? toYesNoBool(payload?.feeWaiverRequested)
            : initialCase?.feeWaiver?.requested,
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

  return <IntakeWizardClient initialCase={initialCase} caseId={caseId} onComplete={handleComplete} />;
}

export default function IntakeWizardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <IntakeWizardInner />
    </Suspense>
  );
}


