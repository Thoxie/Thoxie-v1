/* PATH: app/_lib/ai/server/buildChatContext.js */
/* FILE: buildChatContext.js */
/* ACTION: FULL OVERWRITE */

 // path: /app/_lib/ai/server/buildChatContext.js

/* FILE: app/_lib/ai/server/buildChatContext.js */
/* ACTION: FULL OVERWRITE EXISTING FILE */

/**
 * Build a compact, deterministic, model-friendly context block.
 * This version expects server-loaded case data and document metadata.
 */

function line(label, value) {
  const v = typeof value === "string" ? value.trim() : value;
  if (!v) return `${label}: (not set)`;
  return `${label}: ${v}`;
}

function safeStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function buildChatContext({ caseId, caseSnapshot, documents }) {
  const c = caseSnapshot && typeof caseSnapshot === "object" ? caseSnapshot : {};
  const j = c.jurisdiction && typeof c.jurisdiction === "object" ? c.jurisdiction : {};

  const header = [
    "THOXIE_CONTEXT_V3",
    "CONTEXT_PRIORITY",
    "1. Retrieved document evidence",
    "2. Server case snapshot",
    "3. General reasoning",
    "",
    "CASE_CONTEXT",
    line("caseId", safeStr(caseId) || "(none)"),
    line("role", safeStr(c.role)),
    line("category", safeStr(c.category)),
    line("county", safeStr(j.county)),
    line("courtName", safeStr(j.courtName)),
    line("caseNumber", safeStr(c.caseNumber)),
    line("hearingDate", safeStr(c.hearingDate)),
    line("hearingTime", safeStr(c.hearingTime)),
    line("amountClaimed", safeStr(c.amountClaimed)),
    line("factsSummary", safeStr(c.factsSummary)),
  ].join("\n");

  const docs = Array.isArray(documents) ? documents : [];
  const docsWithText = docs.filter((d) => safeStr(d?.extractedText)).length;

  const docLines = docs.slice(0, 50).map((d, idx) => {
    const obj = d && typeof d === "object" ? d : {};
    const name = safeStr(obj.name) || `Document ${idx + 1}`;
    const mimeType = safeStr(obj.mimeType) || "(unknown type)";
    const uploadedAt = safeStr(obj.uploadedAt);
    const docType = safeStr(obj.docType);
    const evidenceCategory = safeStr(obj.evidenceCategory);
    const size = safeNum(obj.size);
    const hasText = safeStr(obj.extractedText) ? "storedText=yes" : "storedText=no";

    const pieces = [name, mimeType, hasText];

    if (docType) pieces.push(`docType=${docType}`);
    if (evidenceCategory) pieces.push(`category=${evidenceCategory}`);
    if (size) pieces.push(`${size} bytes`);
    if (uploadedAt) pieces.push(uploadedAt);

    return `- ${pieces.join(" | ")}`;
  });

  const docBlock = [
    "DOCUMENT_INVENTORY",
    `documentCount: ${docs.length}`,
    `documentsWithStoredText: ${docsWithText}`,
    ...(docLines.length > 0 ? ["", ...docLines] : ["", "- (no server-stored documents found)"]),
  ].join("\n");

  return `${header}\n\n${docBlock}`;
}
