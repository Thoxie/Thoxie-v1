// Path: /app/_config/forms/caSmallClaimsForms.js

/**
 * California Small Claims — Forms + Rules (v1)
 *
 * Minimal, statewide base:
 * - Supports plaintiff filing + service for beta
 * - Keeps rules deterministic
 * - Allows later county overrides
 */

const CA_SMALL_CLAIMS_FORMS = {
  state: "CA",
  domain: "small_claims",

  forms: {
    "SC-100": {
      code: "SC-100",
      title: "Plaintiff’s Claim and ORDER to Go to Small Claims Court",
      stage: "Filing",
      requiredByDefault: true,
      url: "https://www.courts.ca.gov/documents/sc100.pdf",
    },

    "SC-100A": {
      code: "SC-100A",
      title: "Other Plaintiffs or Defendants (Attachment)",
      stage: "Filing",
      requiredByDefault: false,
      url: "https://www.courts.ca.gov/documents/sc100a.pdf",
    },

    "SC-100-INFO": {
      code: "SC-100-INFO",
      title: "Information for the Plaintiff (Small Claims)",
      stage: "Filing",
      requiredByDefault: false,
      url: "https://www.courts.ca.gov/documents/sc100info.pdf",
    },

    "SC-103": {
      code: "SC-103",
      title: "Fictitious Business Name (Small Claims)",
      stage: "Filing",
      requiredByDefault: false,
      url: "https://www.courts.ca.gov/documents/sc103.pdf",
    },

    "SC-104": {
      code: "SC-104",
      title: "Proof of Service (Small Claims)",
      stage: "Service",
      requiredByDefault: false,
      url: "https://www.courts.ca.gov/documents/sc104.pdf",
    },

    "SC-104A": {
      code: "SC-104A",
      title: "Proof of Mailing (Substituted Service) (Small Claims)",
      stage: "Service",
      requiredByDefault: false,
      url: "https://www.courts.ca.gov/documents/sc104a.pdf",
    },

    "SC-112A": {
      code: "SC-112A",
      title: "Proof of Service by Mail",
      stage: "Service",
      requiredByDefault: false,
      url: "https://www.courts.ca.gov/documents/sc112a.pdf",
    },

    "FW-001": {
      code: "FW-001",
      title: "Request to Waive Court Fees",
      stage: "Filing",
      requiredByDefault: false,
      url: "https://www.courts.ca.gov/documents/fw001.pdf",
    },

    "FW-003": {
      code: "FW-003",
      title: "Order on Court Fee Waiver",
      stage: "Filing",
      requiredByDefault: false,
      url: "https://www.courts.ca.gov/documents/fw003.pdf",
    },
  },

  rules: [
    { id: "base_sc100", include: ["SC-100"] },

    // Always recommend the plaintiff read SC-100-INFO (not filed)
    { id: "recommend_sc100_info", include: ["SC-100-INFO"] },

    // Multiple parties -> SC-100A
    {
      id: "sc100a_multiple_parties",
      when: [
        { path: "partyCounts.totalPlaintiffs", op: "gt", value: 1 },
        { path: "partyCounts.totalDefendants", op: "gt", value: 1 },
      ],
      include: ["SC-100A"],
      logic: "OR",
    },

    // DBA -> SC-103 (will be conditional until user answers)
    {
      id: "sc103_dba",
      when: [{ path: "claim.plaintiffUsesDba", op: "truthy" }],
      include: ["SC-103"],
      logic: "AND",
    },

    // Fee waiver -> FW forms
    {
      id: "fee_waiver",
      when: [{ path: "feeWaiver.requested", op: "truthy" }],
      include: ["FW-001", "FW-003"],
      logic: "AND",
    },

    // Service method -> proof of service form(s)
    {
      id: "service_personal_or_posting",
      when: [{ path: "service.method", op: "in", value: ["personal", "posting"] }],
      include: ["SC-104"],
      logic: "AND",
    },

    {
      id: "service_substituted",
      when: [{ path: "service.method", op: "eq", value: "substituted" }],
      include: ["SC-104", "SC-104A"],
      logic: "AND",
    },

    {
      id: "service_mail",
      when: [{ path: "service.method", op: "eq", value: "mail" }],
      include: ["SC-112A"],
      logic: "AND",
    },
  ],

  countyOverrides: {
    "San Mateo": {
      addRules: [],
      addForms: {},
      notes: [],
    },
  },
};

export default CA_SMALL_CLAIMS_FORMS;
;

