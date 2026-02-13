// Path: /app/_lib/draftGenerator.js

/**
 * Deterministic Draft Generator (v1 beta)
 *
 * Goal:
 * - Produce a conservative, plain-text draft from an existing Case record.
 * - No AI dependency required.
 *
 * Upgrade:
 * - Forms Checklist section is resolved via a jurisdiction registry:
 *   (state, domain) -> config -> rules -> output.
 * - Adds SC-100 readiness checklist (deterministic, no guessing).
 */

import { resolveForms } from "./formRequirementsResolver";
import { getSC100DraftData } from "./sc100Mapper";

export function generateSmallClaimsDraft(caseRecord) {
  const now = new Date().toISOString();

  const county = safe(caseRecord?.jurisdiction?.county) || "California (county not set)";
  const court = safe(caseRecord?.jurisdiction?.courtName) || "Small Claims Court (court not set)";
  const courtAddress = safe(caseRecord?.jurisdiction?.courtAddress);

  const plaintiff = safe(caseRecord?.parties?.plaintiff) || "(Plaintiff name not set)";
  const defendant = safe(caseRecord?.parties?.defendant) || "(Defendant name not set)";

  const damages = caseRecord?.damages;
  const damagesLine =
    damages !== undefined && damages !== null && String(damages).trim()
      ? String(damages).trim()
      : "(Amount not set)";

  const factsItems = Array.isArray(caseRecord?.factsItems) ? caseRecord.factsItems : [];
  const legacyFacts = safe(caseRecord?.facts);

  const formsChecklist = buildFormsChecklist(caseRecord);
  const sc100Checklist = buildSC100Checklist(caseRecord);

  const body = [
    "THOXIE — California Small Claims Draft (v1 beta)",
    `Generated: ${now}`,
    "",
    "DISCLAIMER:",
    "This draft is generated from the information you entered. It is not legal advice.",
    "Review for accuracy. Add missing facts, dates, and addresses before filing.",
    "",
    "1) JURISDICTION",
    `County: ${county}`,
    `Court: ${court}`,
    courtAddress ? `Court Address: ${courtAddress}` : null,
    "",
    "2) PARTIES",
    `Plaintiff: ${plaintiff}`,
    `Defendant: ${defendant}`,
    "",
    "3) AMOUNT CLAIMED (Damages)",
    damagesLine,
    "",
    "4) FACTS (Chronology)",
    ...renderFacts(factsItems, legacyFacts),
    "",
    "5) RELIEF REQUESTED",
    "- Monetary judgment in the amount stated above, plus allowable court costs.",
    "",
    "6) ATTACHMENTS / EVIDENCE (to be added by user)",
    "- List the key documents you will rely on (e.g., contracts, invoices, texts, photos).",
    "",
    "7) FORMS CHECKLIST (rules-based)",
    ...formsChecklist,
    "",
    "8) SC-100 READINESS CHECKLIST (deterministic)",
    ...sc100Checklist,
    "",
    "Signature: _____________________________",
    "Date: _________________________________",
    "",
  ]
    .filter((x) => x !== null)
    .join("\n");

  return {
    title: `Small Claims Draft — ${plaintiff} v. ${defendant}`,
    draftType: "Small Claims Draft",
    format: "text/plain",
    content: body,
  };
}

function buildFormsChecklist(caseRecord) {
  const { required, conditional, missingInfoQuestions, notes, meta } = resolveForms(caseRecord, {
    state: safe(caseRecord?.jurisdiction?.state) || "CA",
    domain: "small_claims",
  });

  const lines = [];

  lines.push(
    `Jurisdiction: ${meta?.state || "CA"} · ${meta?.domain || "small_claims"}${meta?.county ? " · " + meta.county : ""}`
  );
  lines.push("");

  lines.push("REQUIRED (based on current case data):");
  if (!required || required.length === 0) {
    lines.push("- (No required forms resolved yet)");
  } else {
    for (const f of required) {
      lines.push(`- ${f.code}: ${f.title} [${f.stage}]`);
    }
  }

  lines.push("");
  lines.push("POSSIBLY REQUIRED (depends on missing info or choices):");
  if (!conditional || conditional.length === 0) {
    lines.push("- (None flagged)");
  } else {
    for (const f of conditional) {
      lines.push(`- ${f.code}: ${f.title} [${f.stage}] — ${f.reason}`);
    }
  }

  if (missingInfoQuestions && missingInfoQuestions.length) {
    lines.push("");
    lines.push("MISSING INFO TO CONFIRM FORMS:");
    for (const q of missingInfoQuestions) {
      lines.push(`- ${q}`);
    }
  }

  if (notes && notes.length) {
    lines.push("");
    lines.push("COUNTY NOTES:");
    for (const n of notes) {
      lines.push(`- ${n}`);
    }
  }

  return lines;
}

function buildSC100Checklist(caseRecord) {
  const { missingRequired, missingRecommended } = getSC100DraftData(caseRecord);

  const lines = [];

  lines.push("REQUIRED INFORMATION (must be filled before filing SC-100):");
  if (!missingRequired || missingRequired.length === 0) {
    lines.push("- (None detected)");
  } else {
    for (const f of missingRequired) {
      lines.push(`- ${f.label}`);
    }
  }

  lines.push("");
  lines.push("RECOMMENDED INFORMATION (strongly recommended for completeness):");
  if (!missingRecommended || missingRecommended.length === 0) {
    lines.push("- (None detected)");
  } else {
    for (const f of missingRecommended) {
      lines.push(`- ${f.label}`);
    }
  }

  return lines;
}

function renderFacts(items, legacyFacts) {
  const lines = [];

  if (items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const dt = safe(it.date);
      const text = safe(it.text);
      if (!text) continue;
      lines.push(`- ${dt ? dt + ": " : ""}${text}`);
    }
  }

  if (lines.length === 0 && legacyFacts) {
    lines.push(legacyFacts);
  }

  if (lines.length === 0) {
    lines.push("(No facts entered yet)");
  }

  return lines;
}

function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return s.trim();
}




