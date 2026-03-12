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
    "THOXIE_CONTEXT_V2",
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
  const docLines = docs.slice(0, 50).map((d, idx) => {
    const obj = d && typeof d === "object" ? d : {};
    const name = safeStr(obj.name) || `Document ${idx + 1}`;
    const mimeType = safeStr(obj.mimeType) || "(unknown type)";
    const uploadedAt = safeStr(obj.uploadedAt);
    const docType = safeStr(obj.docType);
    const evidenceCategory = safeStr(obj.evidenceCategory);
    const size = safeNum(obj.size);

    const pieces = [name, mimeType];

    if (docType) pieces.push(`docType=${docType}`);
    if (evidenceCategory) pieces.push(`category=${evidenceCategory}`);
    if (size) pieces.push(`${size} bytes`);
    if (uploadedAt) pieces.push(uploadedAt);

    return `- ${pieces.join(" | ")}`;
  });

  const docBlock =
    docLines.length > 0
      ? ["DOCUMENT_INVENTORY", ...docLines].join("\n")
      : "DOCUMENT_INVENTORY\n- (no server-stored documents found)";

  return `${header}\n\n${docBlock}`;
}
