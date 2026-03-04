// Path: /app/_lib/ai/shared/buildCasePayload.js

/**
 * buildCasePayload (v1)
 * Deterministic, client-safe payload builder for AI + future form generation.
 *
 * Design goals:
 * - Stable schema (versioned)
 * - No blobs, no binary
 * - Includes: jurisdiction, parties, claim basics, narrative, and document metadata
 * - Also produces a backward-compatible "caseSnapshot" for readiness + chat context
 */

function s(v) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function safeObj(v) {
  return v && typeof v === "object" ? v : {};
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function joinAddress(street, city, state, zip) {
  const parts = [s(street), s(city), s(state), s(zip)].filter(Boolean);
  return parts.join(", ");
}

function normalizeCaseRole(role) {
  const r = s(role).toLowerCase();
  if (r === "plaintiff" || r === "defendant") return r;
  // Some parts of the UI use "Plaintiff"/"Defendant"
  if (r === "plaintiff (starting the case)") return "plaintiff";
  if (r === "defendant (responding)") return "defendant";
  return s(role) || "";
}

export function buildCasePayload({ caseId = "", caseRecord = null, documents = [] }) {
  const c = safeObj(caseRecord);
  const j = safeObj(c.jurisdiction);
  const claim = safeObj(c.claim);
  const parties = safeObj(c.parties);

  // Addresses: intake stores combined strings; some UI code also uses parts
  const plaintiffAddress = s(parties.plaintiffAddress) || s(parties.plaintiffAddressParts?.full) || "";
  const defendantAddress = s(parties.defendantAddress) || s(parties.defendantAddressParts?.full) || "";

  const payload = {
    schema: "THOXIE_AI_CASE_PAYLOAD_V1",
    caseId: s(caseId) || s(c.id) || "",
    jurisdiction: {
      state: "CA",
      county: s(j.county),
      courtId: s(j.courtId),
      courtName: s(j.courtName),
      courtAddress: s(j.courtAddress),
      department: s(j.department),
    },

    role: normalizeCaseRole(c.role),

    parties: {
      plaintiff: {
        name: s(parties.plaintiff),
        phone: s(parties.plaintiffPhone),
        email: s(parties.plaintiffEmail),
        address: s(plaintiffAddress),
      },
      defendant: {
        name: s(parties.defendant),
        phone: s(parties.defendantPhone),
        email: s(parties.defendantEmail),
        address: s(defendantAddress),
      },
      // optional flags
      plaintiffUsesDba: typeof claim.plaintiffUsesDba === "boolean" ? claim.plaintiffUsesDba : null,
      plaintiffDbaName: s(claim.plaintiffDbaName),
    },

    claim: {
      category: s(c.category) || s(claim.reason) || s(claim.type),
      amountClaimed: s(claim.amount ?? c.damages ?? c.amountClaimed ?? ""),
      incidentDate: s(claim.incidentDate),
      // The intake stores narrative as c.facts
      narrative: s(c.facts),
    },

    caseMeta: {
      caseNumber: s(c.caseNumber),
      hearingDate: s(c.hearingDate),
      hearingTime: s(c.hearingTime),
    },

    documents: safeArr(documents)
      .slice(0, 150)
      .map((d) => {
        const obj = safeObj(d);
        return {
          docId: s(obj.docId),
          name: s(obj.name),
          mimeType: s(obj.mimeType),
          uploadedAt: s(obj.uploadedAt),
          size: obj.size ?? null,
          // Evidence metadata used today + later
          docType: s(obj.docType),
          docTypeLabel: s(obj.docTypeLabel),
          exhibitDescription: s(obj.exhibitDescription),
          evidenceCategory: s(obj.evidenceCategory),
          evidenceSupports: safeArr(obj.evidenceSupports),
          // RAG text (if present). Keep as-is; no blob content.
          extractedText: s(obj.extractedText),
        };
      }),
  };

  // Backward-compatible snapshot used by:
  // - readiness engine (evaluateCASmallClaimsReadiness)
  // - chat context builder (buildChatContext)
  //
  // IMPORTANT: readiness expects "factsSummary", not "narrative".
  const caseSnapshot = {
    role: payload.role,
    category: payload.claim.category,
    jurisdiction: payload.jurisdiction,
    caseNumber: payload.caseMeta.caseNumber,
    hearingDate: payload.caseMeta.hearingDate,
    hearingTime: payload.caseMeta.hearingTime,
    amountClaimed: payload.claim.amountClaimed,
    factsSummary: payload.claim.narrative,
    // Include parties for future form generation (safe extension; server ignores if unused)
    parties: payload.parties,
  };

  return { payload, caseSnapshot };
}
