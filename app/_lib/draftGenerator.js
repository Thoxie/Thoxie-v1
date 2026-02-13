// Path: /app/_lib/draftGenerator.js

/**
 * Deterministic Draft Generator (v1 beta)
 *
 * Goal:
 * - Produce a conservative, plain-text draft from an existing Case record.
 * - No AI dependency required.
 * - CA-only scope: content is California Small Claims oriented, but not form-specific.
 *
 * NOTE:
 * - This is not legal advice.
 * - The output is a working draft for user review.
 */

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
    "Signature: _____________________________",
    "Date: _________________________________",
    ""
  ]
    .filter((x) => x !== null)
    .join("\n");

  return {
    title: `Small Claims Draft — ${plaintiff} v. ${defendant}`,
    draftType: "Small Claims Draft",
    format: "text/plain",
    content: body
  };
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
    // fallback
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

