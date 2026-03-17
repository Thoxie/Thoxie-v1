/* PATH: app/_lib/ai/server/buildChatContext.js */
/* FILE: buildChatContext.js */
/* ACTION: FULL OVERWRITE */

function line(label, value) {
  const v = typeof value === "string" ? value.trim() : value;
  if (!v && v !== 0) return `${label}: (not set)`;
  return `${label}: ${v}`;
}

function safeStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function uniqueItems(values) {
  const out = [];
  const seen = new Set();

  for (const value of values || []) {
    const cleaned = safeStr(String(value || ""));
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }

  return out;
}

function normalizeSupports(value) {
  if (Array.isArray(value)) {
    return value.map((item) => safeStr(item)).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function summarizeDocuments(documents) {
  const docs = Array.isArray(documents) ? documents : [];
  const docsWithText = docs.filter((d) => safeStr(d?.extractedText)).length;
  const docsAiReady = docs.filter(
    (d) => d?.readableByAI || (safeStr(d?.extractedText) && Number(d?.chunkCount || 0) > 0)
  ).length;
  const docsWithOcr = docs.filter(
    (d) => safeStr(d?.ocrStatus) || safeStr(d?.extractionMethod) === "ocr"
  ).length;

  return {
    total: docs.length,
    docsWithText,
    docsAiReady,
    docsWithOcr,
  };
}

function buildDocumentInventoryLines(documents) {
  const docs = Array.isArray(documents) ? documents : [];

  return docs.slice(0, 50).map((doc, idx) => {
    const obj = doc && typeof doc === "object" ? doc : {};
    const name = safeStr(obj.name) || `Document ${idx + 1}`;
    const mimeType = safeStr(obj.mimeType) || "(unknown type)";
    const uploadedAt = safeStr(obj.uploadedAt);
    const docType = safeStr(obj.docType);
    const evidenceCategory = safeStr(obj.evidenceCategory);
    const exhibitDescription = safeStr(obj.exhibitDescription);
    const size = safeNum(obj.size);
    const chunkCount = Number(obj.chunkCount || 0);
    const extractionMethod = safeStr(obj.extractionMethod);
    const ocrStatus = safeStr(obj.ocrStatus);
    const supports = normalizeSupports(obj.evidenceSupports);

    const pieces = [name, mimeType];
    pieces.push(safeStr(obj.extractedText) ? "storedText=yes" : "storedText=no");
    pieces.push(
      obj?.readableByAI || (safeStr(obj?.extractedText) && chunkCount > 0)
        ? "aiReady=yes"
        : "aiReady=no"
    );

    if (docType) pieces.push(`docType=${docType}`);
    if (evidenceCategory) pieces.push(`category=${evidenceCategory}`);
    if (exhibitDescription) pieces.push(`exhibit=${exhibitDescription}`);
    if (supports.length > 0) pieces.push(`supports=${supports.slice(0, 4).join(" | ")}`);
    if (size) pieces.push(`${size} bytes`);
    if (chunkCount > 0) pieces.push(`chunks=${chunkCount}`);
    if (ocrStatus) pieces.push(`ocr=${ocrStatus}`);
    if (extractionMethod) pieces.push(`method=${extractionMethod}`);
    if (uploadedAt) pieces.push(uploadedAt);

    return `- ${pieces.join(" | ")}`;
  });
}

function buildPriorityEvidenceLines(hits) {
  const list = Array.isArray(hits) ? hits : [];
  if (list.length === 0) return ["- (no retrieved hits)"];

  const grouped = new Map();

  for (const hit of list) {
    const key = safeStr(hit?.docId) || safeStr(hit?.docName) || "unknown-doc";

    if (!grouped.has(key)) {
      grouped.set(key, {
        docName: safeStr(hit?.docName) || "Untitled document",
        docType: safeStr(hit?.docType),
        evidenceCategory: safeStr(hit?.evidenceCategory),
        sectionLabels: [],
        chunkKinds: [],
        citations: [],
      });
    }

    const entry = grouped.get(key);
    if (safeStr(hit?.sectionLabel)) entry.sectionLabels.push(safeStr(hit.sectionLabel));
    if (safeStr(hit?.chunkKind)) entry.chunkKinds.push(safeStr(hit.chunkKind));
    if (safeStr(hit?.citationLabel)) entry.citations.push(safeStr(hit.citationLabel));
  }

  return Array.from(grouped.values())
    .slice(0, 12)
    .map((entry) => {
      const parts = [entry.docName];
      if (entry.docType) parts.push(`type=${entry.docType}`);
      if (entry.evidenceCategory) parts.push(`category=${entry.evidenceCategory}`);
      const sections = uniqueItems(entry.sectionLabels).slice(0, 4);
      const kinds = uniqueItems(entry.chunkKinds).slice(0, 4);
      const citations = uniqueItems(entry.citations).slice(0, 3);
      if (sections.length > 0) parts.push(`sections=${sections.join(" | ")}`);
      if (kinds.length > 0) parts.push(`chunkKinds=${kinds.join(", ")}`);
      if (citations.length > 0) parts.push(`citations=${citations.join(" ; ")}`);
      return `- ${parts.join(" | ")}`;
    });
}

function buildEvidenceSummaryLines(evidencePacket) {
  const packet = evidencePacket && typeof evidencePacket === "object" ? evidencePacket : {};
  const lines = [];

  if (safeStr(packet.queryType)) lines.push(`queryType: ${packet.queryType}`);

  if (Array.isArray(packet.claims) && packet.claims.length > 0) {
    lines.push(`claims: ${packet.claims.slice(0, 6).join(" | ")}`);
  }

  if (Array.isArray(packet.defenses) && packet.defenses.length > 0) {
    lines.push(`defenses: ${packet.defenses.slice(0, 6).join(" | ")}`);
  }

  if (Array.isArray(packet.requestedRelief) && packet.requestedRelief.length > 0) {
    lines.push(`requestedRelief: ${packet.requestedRelief.slice(0, 4).join(" | ")}`);
  }

  if (Array.isArray(packet.authorities) && packet.authorities.length > 0) {
    lines.push(`authoritiesInEvidence: ${packet.authorities.slice(0, 6).join(" | ")}`);
  }

  if (Array.isArray(packet.contradictions) && packet.contradictions.length > 0) {
    lines.push(`contradictions: ${packet.contradictions.slice(0, 4).join(" | ")}`);
  }

  if (Array.isArray(packet.gaps) && packet.gaps.length > 0) {
    lines.push(`gaps: ${packet.gaps.slice(0, 6).join(" | ")}`);
  }

  if (lines.length === 0) return ["- (no structured evidence summary available)"];
  return lines.map((lineValue) => `- ${lineValue}`);
}

export function buildChatContext({
  caseId,
  caseSnapshot,
  documents,
  query = "",
  hits = [],
  evidencePacket = null,
}) {
  const c = caseSnapshot && typeof caseSnapshot === "object" ? caseSnapshot : {};
  const j = c.jurisdiction && typeof c.jurisdiction === "object" ? c.jurisdiction : {};
  const docSummary = summarizeDocuments(documents);

  const header = [
    "THOXIE_CONTEXT_V5",
    "DECISION_ORDER",
    "1. Retrieved evidence packet",
    "2. Retrieved evidence snippets",
    "3. Server case snapshot",
    "4. Structured document inventory",
    "5. General reasoning only after evidence review",
    "",
    "CASE_CONTEXT",
    line("caseId", safeStr(caseId) || "(none)"),
    line("activeQuery", safeStr(query)),
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

  const docBlock = [
    "DOCUMENT_INVENTORY",
    `documentCount: ${docSummary.total}`,
    `documentsWithStoredText: ${docSummary.docsWithText}`,
    `documentsAiReady: ${docSummary.docsAiReady}`,
    `documentsWithOcr: ${docSummary.docsWithOcr}`,
    "",
    ...buildDocumentInventoryLines(documents),
  ].join("\n");

  const priorityEvidenceBlock = [
    "PRIORITY_RETRIEVED_EVIDENCE",
    ...buildPriorityEvidenceLines(hits),
  ].join("\n");

  const evidenceSummaryBlock = [
    "STRUCTURED_EVIDENCE_SUMMARY",
    ...buildEvidenceSummaryLines(evidencePacket),
  ].join("\n");

  const analysisFrame = [
    "LEGAL_ANALYSIS_FRAME",
    "- Treat filings differently from exhibits and correspondence.",
    "- Prefer captions, headings, numbered sections, relief language, and authority-bearing sections when they are retrieved.",
    "- Separate facts from argument.",
    "- Separate claims or defenses from requested relief.",
    "- Tie contradictions and missing proof to the specific issue they affect when possible.",
    "- Use only grounded citations already supplied by the retrieval pipeline.",
    "- If evidence is missing, say that it is missing instead of inferring it.",
  ].join("\n");

  return `${header}\n\n${docBlock}\n\n${priorityEvidenceBlock}\n\n${evidenceSummaryBlock}\n\n${analysisFrame}`;
}
