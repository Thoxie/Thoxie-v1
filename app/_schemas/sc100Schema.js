// Path: /app/_schemas/sc100Schema.js

/**
 * SC-100 Schema (v1) — used by /app/_lib/sc100Mapper.js
 *
 * Contract:
 * - Must export SC100_SCHEMA_V1 as a named export.
 * - SC100_SCHEMA_V1 must have:
 *    - required: [{ key, label, path }]
 *    - recommended: [{ key, label, path }]
 *
 * Paths match the `data` shape produced by sc100Mapper.js:
 * data = { jurisdiction: {...}, parties: {...}, claim: {...} }
 */

export const SC100_SCHEMA_V1 = {
  formCode: "SC-100",
  version: "v1",

  required: [
    { key: "county", label: "County", path: "jurisdiction.county" },
    { key: "courtName", label: "Court name", path: "jurisdiction.courtName" },

    { key: "plaintiffName", label: "Plaintiff name", path: "parties.plaintiff.name" },
    { key: "defendantName", label: "Defendant name", path: "parties.defendant.name" },

    { key: "claimAmount", label: "Amount of claim", path: "claim.amount" },
    { key: "claimReason", label: "Reason for claim", path: "claim.reason" },
    { key: "claimFacts", label: "Facts (what happened)", path: "claim.facts" },
  ],

  recommended: [
    { key: "courtAddress", label: "Court address", path: "jurisdiction.courtAddress" },

    { key: "plaintiffAddress", label: "Plaintiff address", path: "parties.plaintiff.address" },
    { key: "plaintiffPhone", label: "Plaintiff phone", path: "parties.plaintiff.phone" },
    { key: "plaintiffEmail", label: "Plaintiff email", path: "parties.plaintiff.email" },

    { key: "defendantAddress", label: "Defendant address", path: "parties.defendant.address" },
    { key: "defendantPhone", label: "Defendant phone", path: "parties.defendant.phone" },

    { key: "where", label: "Where it happened", path: "claim.where" },
    { key: "dateRange", label: "When it happened", path: "claim.dateRange" },
  ],
};

export default SC100_SCHEMA_V1;

