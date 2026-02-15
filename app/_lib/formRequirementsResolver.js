// Path: /app/_lib/formRequirementsResolver.js

import { getFormsConfig } from "../_config/forms";

export function resolveForms(caseRecord, opts = {}) {
  const profile = buildCaseProfile(caseRecord);

  const state = safe(opts.state) || safe(profile?.jurisdiction?.state) || "CA";
  const domain = safe(opts.domain) || "small_claims";

  const cfg = getFormsConfig(state, domain);
  if (!cfg) {
    return {
      required: [],
      conditional: [],
      missingInfoQuestions: ["No forms config found for this jurisdiction."],
      notes: [],
      meta: { state, domain, county: safe(profile?.jurisdiction?.county) },
    };
  }

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
  const conditionalSet = new Map();

  Object.keys(formRegistry).forEach((code) => {
    const f = formRegistry[code];
    if (f && f.requiredByDefault) requiredSet.add(code);
  });

  for (const rule of rules) {
    const passed = evaluateRule(rule, profile);
    const hasWhen = Array.isArray(rule.when) && rule.when.length > 0;

    if (!hasWhen || passed === true) {
      (rule.include || []).forEach((code) => requiredSet.add(code));
      continue;
    }

    if (passed === "unknown") {
      (rule.include || []).forEach((code) => {
        conditionalSet.set(code, {
          code,
          title: formRegistry?.[code]?.title || code,
          stage: formRegistry?.[code]?.stage || "Unknown",
          url: formRegistry?.[code]?.url || "",
          reason: ruleUnknownReason(rule),
        });
      });
    }
  }

  const missingInfoQuestions = buildMissingInfoQuestions(profile);

  const required = Array.from(requiredSet)
    .map((code) => ({
      code,
      title: formRegistry?.[code]?.title || code,
      stage: formRegistry?.[code]?.stage || "Unknown",
      url: formRegistry?.[code]?.url || "",
    }))
    .sort((a, b) => a.stage.localeCompare(b.stage) || a.code.localeCompare(b.code));

  const conditional = Array.from(conditionalSet.values()).sort(
    (a, b) => a.stage.localeCompare(b.stage) || a.code.localeCompare(b.code)
  );

  const notes = [];
  if (override && Array.isArray(override.notes) && override.notes.length) {
    notes.push(...override.notes);
  }

  return {
    required,
    conditional,
    missingInfoQuestions,
    notes,
    meta: { state, domain, county },
  };
}

export function resolveSmallClaimsForms(caseRecord) {
  return resolveForms(caseRecord, { state: "CA", domain: "small_claims" });
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

    claim: {
      defendantIsPublicEntity: !!caseRecord?.claim?.defendantIsPublicEntity,
      involvesVehicle: !!caseRecord?.claim?.involvesVehicle,
      involvesContract: !!caseRecord?.claim?.involvesContract,

      // used to drive SC-103 deterministically
      plaintiffUsesDba: !!caseRecord?.claim?.plaintiffUsesDba,
    },
  };
}

function evaluateRule(rule, profile) {
  if (!Array.isArray(rule.when) || rule.when.length === 0) return true;

  const logic = (rule.logic || "AND").toUpperCase();
  const results = rule.when.map((cond) => evaluateCondition(cond, profile));

  if (logic === "AND") {
    if (results.some((r) => r === false)) return false;
    if (results.some((r) => r === "unknown")) return "unknown";
    return true;
  }

  if (results.some((r) => r === true)) return true;
  if (results.some((r) => r === "unknown")) return "unknown";
  return false;
}

function evaluateCondition(cond, profile) {
  const path = cond?.path;
  const op = cond?.op;
  const value = cond?.value;

  const actual = getByPath(profile, path);

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

  if (!safe(profile?.service?.method)) {
    q.push("How will the defendant be served (personal, substituted, mail, posting)?");
  }

  if (profile?.claim?.plaintiffUsesDba !== true && profile?.claim?.plaintiffUsesDba !== false) {
    q.push("Are you suing as a business using a DBA/fictitious business name (yes/no)?");
  }

  if (profile?.partyCounts?.totalPlaintiffs === 0) q.push("What is the plaintiff’s full legal name?");
  if (profile?.partyCounts?.totalDefendants === 0) q.push("What is the defendant’s full legal name?");

  if (profile?.claim?.defendantIsPublicEntity === true) {
    q.push(
      "Is the defendant a public entity (city/county/state agency)? If yes, confirm you met any pre-claim requirements."
    );
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

