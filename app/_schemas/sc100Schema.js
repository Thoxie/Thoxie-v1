// Path: /app/_lib/sc100Mapper.js

import { SC100_SCHEMA_V1 } from "../_schemas/sc100Schema";

/**
 * getSC100DraftData(caseRecord)
 *
 * Output:
 * {
 *   data: { ...sc100Fields },
 *   missingRequired: [ {key,label}... ],
 *   missingRecommended: [ {key,label}... ]
 * }
 *
 * Deterministic mapping:
 * - Uses the saved Case record structure (jurisdiction, parties, claim).
 * - Does NOT invent addresses or facts.
 * - Missing fields are explicitly reported.
 */

export function getSC100DraftData(caseRecord) {
  const data = {
    jurisdiction: {
      county: safe(caseRecord?.jurisdiction?.county),
      courtName: safe(caseRecord?.jurisdiction?.courtName),
      courtAddress: safe(caseRecord?.jurisdiction?.courtAddress),
    },

    parties: {
      plaintiff: {
        name: safe(caseRecord?.parties?.plaintiff),
        address: safe(caseRecord?.parties?.plaintiffAddress),
        phone: safe(caseRecord?.parties?.plaintiffPhone),
        email: safe(caseRecord?.parties?.plaintiffEmail),
      },

      defendant: {
        name: safe(caseRecord?.parties?.defendant),
        address: safe(caseRecord?.parties?.defendantAddress),
        phone: safe(caseRecord?.parties?.defendantPhone),
        email: safe(caseRecord?.parties?.defendantEmail),
      },
    },

    claim: {
      amount: normalizeAmount(caseRecord?.claim?.amount || caseRecord?.damages),
      reason: safe(caseRecord?.claim?.reason) || safe(caseRecord?.category) || safe(caseRecord?.claimReason),
      where: safe(caseRecord?.claim?.where) || safe(caseRecord?.jurisdiction?.county) || safe(caseRecord?.claimWhere),
      dateRange:
        safe(caseRecord?.claim?.incidentDate) ||
        safe(caseRecord?.claim?.dateRange) ||
        safe(caseRecord?.claimDateRange),
      facts: buildFacts(caseRecord),
    },
  };

  const missingRequired = findMissing(SC100_SCHEMA_V1.required, data);
  const missingRecommended = findMissing(SC100_SCHEMA_V1.recommended, data);

  return { data, missingRequired, missingRecommended };
}

/* ----------------------- helpers ----------------------- */

function buildFacts(caseRecord) {
  const factsItems = Array.isArray(caseRecord?.factsItems) ? caseRecord.factsItems : [];
  if (factsItems.length > 0) {
    const lines = [];
    for (const it of factsItems) {
      const dt = safe(it?.date);
      const text = safe(it?.text);
      if (!text) continue;
      lines.push(`${dt ? dt + ": " : ""}${text}`);
    }
    return lines.join("\n");
  }

  return safe(caseRecord?.facts);
}

function findMissing(specList, data) {
  const out = [];
  const arr = Array.isArray(specList) ? specList : [];
  for (const f of arr) {
    const val = getByPath(data, f.path);
    if (!hasValue(val)) out.push({ key: f.key, label: f.label });
  }
  return out;
}

function getByPath(obj, path) {
  if (!path) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function hasValue(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

function normalizeAmount(v) {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  if (!s) return "";
  return s;
}

function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return s.trim();
}

