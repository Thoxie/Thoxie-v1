// Path: /app/_schemas/sc100Schema.js

/**
 * SC-100 Schema (CA Small Claims) — v1
 *
 * Purpose:
 * - Define the minimum data we must collect to populate SC-100 reliably.
 * - Provide a deterministic "missing fields" checklist.
 *
 * Notes:
 * - This is a schema/contract, not a UI spec.
 * - It is intentionally conservative: if we don't have data, we mark it missing.
 */

export const SC100_SCHEMA_V1 = {
  id: "CA_SC100_V1",
  state: "CA",
  domain: "small_claims",
  formCode: "SC-100",
  title: "Plaintiff’s Claim and ORDER to Go to Small Claims Court",

  /**
   * Required fields for a filing-ready packet (minimum).
   * `path` is where we expect the value on the case record (or mapped record).
   */
  required: [
    { key: "jurisdiction.county", path: "jurisdiction.county", label: "County (venue)" },
    { key: "jurisdiction.courtName", path: "jurisdiction.courtName", label: "Court name" },

    { key: "parties.plaintiff.name", path: "parties.plaintiff.name", label: "Plaintiff legal name" },
    { key: "parties.plaintiff.address", path: "parties.plaintiff.address", label: "Plaintiff address" },

    { key: "parties.defendant.name", path: "parties.defendant.name", label: "Defendant legal name" },
    { key: "parties.defendant.address", path: "parties.defendant.address", label: "Defendant address" },

    { key: "claim.amount", path: "claim.amount", label: "Amount claimed" },
    { key: "claim.reason", path: "claim.reason", label: "Reason for claim (short statement)" },
    { key: "claim.where", path: "claim.where", label: "Where the claim arose (city/county)" },
  ],

  /**
   * Helpful fields (not strictly required for a basic draft but often needed).
   * Resolver can emit these as "recommended" later.
   */
  recommended: [
    { key: "parties.plaintiff.phone", path: "parties.plaintiff.phone", label: "Plaintiff phone" },
    { key: "parties.plaintiff.email", path: "parties.plaintiff.email", label: "Plaintiff email" },

    { key: "claim.dateRange", path: "claim.dateRange", label: "Dates (incident/period)" },
    { key: "claim.facts", path: "claim.facts", label: "Facts/chronology (narrative or bullets)" },
  ],
};

