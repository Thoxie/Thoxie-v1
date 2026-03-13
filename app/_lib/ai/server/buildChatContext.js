/* PATH: app/_lib/ai/server/buildChatContext.js */
/* FILE: buildChatContext.js */
/* ACTION: FULL OVERWRITE */

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
    "THOXIE_CONTEXT_V4",
    "DECISION_ORDER",
    "1. Retrieved evidence packet",
    "2. Retrieved evidence snippets",
    "3. Server case snapshot",
    "4. General reasoning",
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
  const docsAiReady = docs.filter(
    (d) => d?.readableByAI || (safeStr(d?.extractedText) && Number(d?.chunkCount || 0) > 0)
  ).length;
  const docsWithOcr = docs.filter(
    (d) => safeStr(d?.ocrStatus) || safeStr(d?.extractionMethod) === "ocr"
  ).length;

  const docLines = docs.slice(0, 50).map((d, idx) => {
    const obj = d && typeof d === "object" ? d : {};
    const name = safeStr(obj.name) || `Document ${idx + 1}`;
    const mimeType = safeStr(obj.mimeType) || "(unknown type)";
    const uploadedAt = safeStr(obj.uploadedAt);
    const docType = safeStr(obj.docType);
    const evidenceCategory = safeStr(obj.evidenceCategory);
    const size = safeNum(obj.size);
    const hasText = safeStr(obj.extractedText) ? "storedText=yes" : "storedText=no";
    const chunkCount = Number(obj.chunkCount || 0);
    const readableByAI =
      obj?.readableByAI || (safeStr(obj?.extractedText) && chunkCount > 0)
        ? "aiReady=yes"
        : "aiReady=no";
    const ocrStatus = safeStr(obj?.ocrStatus);
    const extractionMethod = safeStr(obj?.extractionMethod);

    const pieces = [name, mimeType, hasText, readableByAI];

    if (docType) pieces.push(`docType=${docType}`);
    if (evidenceCategory) pieces.push(`category=${evidenceCategory}`);
    if (size) pieces.push(`${size} bytes`);
    if (chunkCount > 0) pieces.push(`chunks=${chunkCount}`);
    if (ocrStatus) pieces.push(`ocr=${ocrStatus}`);
    if (extractionMethod) pieces.push(`method=${extractionMethod}`);
    if (uploadedAt) pieces.push(uploadedAt);

    return `- ${pieces.join(" | ")}`;
  });

  const docBlock = [
    "DOCUMENT_INVENTORY",
    `documentCount: ${docs.length}`,
    `documentsWithStoredText: ${docsWithText}`,
    `documentsAiReady: ${docsAiReady}`,
    `documentsWithOcr: ${docsWithOcr}`,
    ...(docLines.length > 0 ? ["", ...docLines] : ["", "- (no server-stored documents found)"]),
  ].join("\n");

  const usePolicy = [
    "DOCUMENT_REASONING_POLICY",
    "- Use the evidence packet as the primary reasoning surface.",
    "- Treat omissions, thin factual support, limited citations, and missing numeric/date support as possible weaknesses when the user asks for issue spotting.",
    "- Distinguish between authorities already in the document and candidate authorities that would need verification.",
    "- If the user asks for legal analysis, do not refuse merely because the document does not literally state its own weaknesses.",
  ].join("\n");

  return `${header}\n\n${docBlock}\n\n${usePolicy}`;
}
