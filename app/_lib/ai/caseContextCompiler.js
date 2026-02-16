// Path: /app/_lib/ai/caseContextCompiler.js

/**
 * compileCaseContext()
 * Produces a stable, structured payload that the AI layer consumes.
 *
 * IMPORTANT:
 * - This is server-safe. Do not import client-only repositories here.
 * - In v1, the client will pass caseRecord/readiness into the API.
 * - Later, when cases move server-side, the API can fetch and pass them here.
 */
export function compileCaseContext({
  caseId = "",
  caseRecord = null,
  readiness = null,
  jurisdictionConfig = null,
} = {}) {
  const safeCaseId = String(caseId || "").trim();

  const normalizedCase = normalizeCaseRecord(caseRecord);
  const normalizedReadiness = normalizeReadiness(readiness);

  return {
    caseId: safeCaseId,
    caseRecord: normalizedCase,
    readiness: normalizedReadiness,
    jurisdictionConfig: jurisdictionConfig || null,

    // Convenience summary fields AI will use frequently
    summary: buildSummary(normalizedCase, normalizedReadiness),
  };
}

function normalizeCaseRecord(caseRecord) {
  if (!caseRecord || typeof caseRecord !== "object") return null;

  // Minimal normalization only — do not mutate upstream record.
  const role = (caseRecord.role || "").toString().trim();
  const jurisdiction = caseRecord.jurisdiction && typeof caseRecord.jurisdiction === "object"
    ? caseRecord.jurisdiction
    : {};

  return {
    ...caseRecord,
    role: role || caseRecord.role || "",
    jurisdiction: {
      ...jurisdiction,
      state: (jurisdiction.state || "CA").toString().trim() || "CA",
      county: (jurisdiction.county || "").toString().trim(),
      courtName: (jurisdiction.courtName || "").toString().trim(),
      courtAddress: (jurisdiction.courtAddress || "").toString().trim(),
    },
  };
}

function normalizeReadiness(readiness) {
  if (!readiness || typeof readiness !== "object") return null;

  // We keep this permissive; different evaluators can attach different shapes.
  // But we standardize a few keys we care about.
  const missingFields = Array.isArray(readiness.missingFields)
    ? readiness.missingFields.map((x) => String(x)).filter(Boolean)
    : [];

  return {
    ...readiness,
    missingFields,
  };
}

function buildSummary(caseRecord, readiness) {
  if (!caseRecord) return { hasCase: false };

  const plaintiff = caseRecord?.parties?.plaintiff || caseRecord?.plaintiff || "";
  const defendant = caseRecord?.parties?.defendant || caseRecord?.defendant || "";

  return {
    hasCase: true,
    role: caseRecord.role || "",
    state: caseRecord?.jurisdiction?.state || "CA",
    county: caseRecord?.jurisdiction?.county || "",
    parties: {
      plaintiff: String(plaintiff || "").trim(),
      defendant: String(defendant || "").trim(),
    },
    hasReadiness: !!readiness,
    missingCount: Array.isArray(readiness?.missingFields) ? readiness.missingFields.length : 0,
  };
}

