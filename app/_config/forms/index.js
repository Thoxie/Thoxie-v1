// Path: /app/_config/forms/index.js

import CA_SMALL_CLAIMS_FORMS from "./caSmallClaimsForms";

/**
 * Forms Config Registry (v1)
 *
 * Purpose:
 * - Centralize routing of (state, domain) -> config
 * - Scales to all CA counties and future states by adding new configs here
 *
 * domain examples:
 * - "small_claims"
 */

const REGISTRY = {
  CA: {
    small_claims: CA_SMALL_CLAIMS_FORMS,
  },
};

export function getFormsConfig(state, domain) {
  const s = safe(state) || "CA";
  const d = safe(domain) || "small_claims";
  return REGISTRY?.[s]?.[d] || null;
}

function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return s.trim();
}

