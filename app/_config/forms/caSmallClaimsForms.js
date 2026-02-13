// Path: /app/_config/forms/caSmallClaimsForms.js

/**
 * California Small Claims — Forms + Rules (v1)
 *
 * Design goals:
 * - Statewide base rules first (works for every CA county)
 * - County-specific overrides supported via `countyOverrides`
 * - Conservative defaults: if uncertain, emit a "Missing info" question instead of guessing
 *
 * NOTE:
 * - This config is intentionally extensible for "all counties / all possibilities".
 * - Add more rules incrementally as you validate requirements per county/court.
 */

const CA_SMALL_CLAIMS_FORMS = {
  state: "CA",
  domain: "small_claims",

  // Canonical form registry (used by resolver output)
  forms: {
    "SC-100": {
      code: "SC-100",
      title: "Plaintiff’s Claim and ORDER to Go to Small Claims Court",
      stage: "Filing",
      requiredByDefault: true,
    },

    "SC-100A": {
      code: "SC-100A",
      title: "Other Plaintiffs or Defendants (Attachment)",
      stage: "Filing",
      requiredByDefault: false,
    },

    "SC-104": {
      code: "SC-104",
      title: "Proof of Service (personal service / substituted service / posting)",
      stage: "Service",
      requiredByDefault: false,
    },

    "SC-112A": {
      code: "SC-112A",
      title: "Proof of Service by Mail",
      stage: "Service",
      requiredByDefault: false,
    },

    "FW-001": {
      code: "FW-001",
      title: "Request to Waive Court Fees",
      stage: "Filing",
      requiredByDefault: false,
    },

    "FW-003": {
      code: "FW-003",
      title: "Order on Court Fee Waiver",
      stage: "Filing",
      requiredByDefault: false,
    },
  },

  /**
   * Baseline statewide rules (apply to all counties unless overridden).
   * Conditions are evaluated by the resolver.
   *
   * Supported condition operators: eq, ne, gt, gte, lt, lte, in, truthy, falsy
   */
  rules: [
    // Always include SC-100 for a plaintiff small claims filing
    {
      id: "base_sc100",
      include: ["SC-100"],
    },

    // Multiple parties -> SC-100A attachment
    {
      id: "sc100a_multiple_parties",
      when: [
        { path: "partyCounts.totalPlaintiffs", op: "gt", value: 1 },
        { path: "partyCounts.totalDefendants", op: "gt", value: 1 },
      ],
      include: ["SC-100A"],
      logic: "OR",
    },

    // Fee waiver requested -> FW forms
    {
      id: "fee_waiver",
      when: [{ path: "feeWaiver.requested", op: "truthy" }],
      include: ["FW-001", "FW-003"],
      logic: "AND",
    },

    // Service method selection -> suggest the right proof of service
    // (We treat as conditional because service happens after filing and method may be unknown.)
    {
      id: "service_personal_or_substituted",
      when: [
        { path: "service.method", op: "in", value: ["personal", "substituted", "posting"] },
      ],
      include: ["SC-104"],
      logic: "AND",
    },

    {
      id: "service_mail",
      when: [{ path: "service.method", op: "eq", value: "mail" }],
      include: ["SC-112A"],
      logic: "AND",
    },
  ],

  /**
   * County/court overrides.
   * Structure supports growth:
   * countyOverrides["San Mateo"] = { addRules: [...], addForms: {...}, notes: [...] }
   */
  countyOverrides: {
    // Example stub (no extra rules yet; extend as you validate local requirements)
    "San Mateo": {
      addRules: [],
      addForms: {},
      notes: [],
    },
  },
};

export default CA_SMALL_CLAIMS_FORMS;

