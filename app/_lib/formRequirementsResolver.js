// Path: /app/_lib/formRequirementsResolver.js

import CA_SMALL_CLAIMS_FORMS from "../_config/forms/caSmallClaimsForms";

/**
 * resolveSmallClaimsForms(caseRecord)
 *
 * Output:
 * {
 *   required: [ {code,title,stage}... ],
 *   conditional: [ {code,title,stage,reason}... ],
 *   missingInfoQuestions: [ "..." ],
 *   notes: [ "..." ]
 * }
 *
 * Rules-engine design:
 * - Deterministic evaluation with conservative "unknown" handling.
 * - County overrides supported.
 * - Extensible for all counties / all possibilities by adding rules + form registry entries.
 */

export function resolveSmallClaimsForms(caseRecord) {
  const profile = buildCaseProfile(caseRecord);

  // Select config (CA only for now; extend by state later)
  const cfg = CA_SMALL_CLAIMS_FORMS;

  const county = safe(profile?.jurisdiction?.county);
  const override = county && cfg.countyOverrides ? cfg.countyOverrides[county] : null;

  const formRegistry = {
    ...(cfg.forms || {}),
    ...((override && override.addForms) || {}),
  };

  const rules = [
    ...(cfg.rules || []),
    ...((override && override.addRules) || []),
  ];

  const requiredSet = new Set();
  const conditionalSet = new Map(); // code -> {code,title,stage,reason}

  // Always include any forms flagged requiredByDefault (rare; keep conservative)
  Object.keys(formRegistry).forEach((code) => {
    const f = formRegistry[code];
    if (f && f.requiredByDefault) requiredSet.add(code);
  });

  // Evaluate rules
  for (const rule of rules) {
    const passed = evaluateRule(rule, profile);

    // Rules without "when" are unconditional
    const hasWhen = Array.isArray(rule.when) && rule.when.length > 0;

    if (!hasWhen || passed === true) {
      (rule.include || []).forEach((code) => requiredSet.add(code));
      continue;
    }

    // If we can’t decide (unknown), emit as conditional with missing question
    if (passed === "unknown") {
      (rule.include || []).forEach((code) => {
        conditionalSet.set(code, {
          code,
          title: formRegistry?.[code]?.title || code,
          stage: formRegistry?.[code]?.stage || "Unknown",
          reason: ruleUnknownReason(rule),
        });
      });
    }
  }

  // Build missing-info questions based on profile gaps that affect rules
  const missingInfoQuestions = buildMissingInfoQuestions(profile);

  // Convert to arrays with stable ordering
  const required = Array.from(requiredSet)
    .map((code) => ({
      code,
      title: formRegistry?.[code]?.title || code,
      stage: formRegistry?.[code]?.stage || "Unknown",
    }))
    .sort((a, b) => a.stage.localeCompare(b.stage) || a.code.localeCompare(b.code));

  const conditional = Array.from(conditionalSet.values()).sort(
    (a, b) => a.stage.localeCompare(b.stage) || a.code.localeCompare(b.code)
  );

  const notes = [];
  if (override && Array.isArray(override.notes) && override.notes.length) {
    notes.push(...override.notes);
  }

  return { required, conditional, missingInfoQuestions, notes };
}

/* ----------------------- profile / evaluation ----------------------- */

function buildCaseProfile(caseRecord) {
  const additionalPlaintiffs = Array.isArray(caseRecord?.parties?.additionalPlaintiffs)
    ? caseRecord.parties.additionalPlaintiffs
    : [];
  const additionalDefendants = Array.isArray(caseRecord?.parties?.additionalDefendants)
    ? caseRecord.parties.additionalDefendants
    : [];

  const plaintiffName = safe(caseRecord?.parties?.plaintiff);
  const defendantName = safe(caseRecord?.parties?.defendant);

  const totalPlaintiffs = (plaintiffName ? 1 : 0) + additionalPlaintiffs.length;
  const totalDefendants = (defendantName ? 1 : 0) + additionalDefendants.length;

  return {
    jurisdiction: {
      state: safe(caseRecord?.jurisdiction?.state) || "CA",
      county: safe(caseRecord?.jurisdiction?.county),
      courtId: safe(caseRecord?.jurisdiction?.courtId),
      courtName: safe(caseRecord?.jurisdiction?.courtName),
    },

    partyCounts: {
      totalPlaintiffs,
      totalDefendants,
    },

    feeWaiver: {
      requested: !!caseRecord?.feeWaiver?.requested,
    },

    service: {
      // expected values: "personal" | "substituted" | "posting" | "mail" | "" (unknown)
      method: safe(caseRecord?.service?.method),
    },

    // Future extensibility (add as intake expands)
    claim: {
      defendantIsPublicEntity: !!caseRecord?.claim?.defendantIsPublicEntity,
      involvesVehicle: !!caseRecord?.claim?.involvesVehicle,
      involvesContract: !!caseRecord?.claim?.involvesContract,
    },
  };
}

function evaluateRule(rule, profile) {
  // No condition => unconditional include
  if (!Array.isArray(rule.when) || rule.when.length === 0) return true;

  const logic = (rule.logic || "AND").toUpperCase();

  const results = rule.when.map((cond) => evaluateCondition(cond, profile));

  // If any condition is unknown, rule is unknown unless logic allows decisive pass/fail
  if (logic === "AND") {
    if (results.some((r) => r === false)) return false;
    if (results.some((r) => r === "unknown")) return "unknown";
    return true;
  }

  // OR
  if (results.some((r) => r === true)) return true;
  if (results.some((r) => r === "unknown")) return "unknown";
  return false;
}

function evaluateCondition(cond, profile) {
  const path = cond?.path;
  const op = cond?.op;
  const value = cond?.value;

  const actual = getByPath(profile, path);

  // Unknown if we need a value but it is missing/empty
  const isMissing =
    actual === undefined ||
    actual === null ||
    (typeof actual === "string" && actual.trim() === "");

  if (op === "truthy") return isMissing ? "unknown" : !!actual;
  if (op === "falsy") return isMissing ? "unknown" : !actual;

  if (isMissing) return "unknown";

  switch (op) {
    case "eq":
      return actual === value;
    case "ne":
      return actual !== value;
    case "gt":
      return Number(actual) > Number(value);
    case "gte":
      return Number(actual) >= Number(value);
    case "lt":
      return Number(actual) < Number(value);
    case "lte":
      return Number(actual) <= Number(value);
    case "in":
      return Array.isArray(value) ? value.includes(actual) : false;
    default:
      return "unknown";
  }
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

function buildMissingInfoQuestions(profile) {
  const q = [];

  // Service method drives proof-of-service form selection
  if (!safe(profile?.service?.method)) {
    q.push("How will the defendant be served (personal, substituted, mail, posting)?");
  }

  // Multiple parties drive SC-100A; if party counts look incomplete, ask
  if (profile?.partyCounts?.totalPlaintiffs === 0) {
    q.push("What is the plaintiff’s full legal name?");
  }
  if (profile?.partyCounts?.totalDefendants === 0) {
    q.push("What is the defendant’s full legal name?");
  }

  // Fee waiver rules
  if (profile?.feeWaiver?.requested === false) {
    // no question
  } else if (profile?.feeWaiver?.requested === true) {
    // no question
  } else {
    q.push("Do you need a fee waiver (yes/no)?");
  }

  // Future: public entity (often has pre-claim requirements; do not guess forms here)
  if (profile?.claim?.defendantIsPublicEntity === true) {
    q.push("Is the defendant a public entity (city/county/state agency)? If yes, confirm you met any pre-claim requirements.");
  }

  return q;
}

function ruleUnknownReason(rule) {
  const id = safe(rule?.id);
  return id ? `Condition not fully determined (rule: ${id}).` : "Condition not fully determined.";
}

function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return s.trim();
}

