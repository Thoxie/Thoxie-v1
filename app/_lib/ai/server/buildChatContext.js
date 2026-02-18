// Path: /app/_lib/ai/server/buildChatContext.js

/**
 * Build a compact, deterministic, model-friendly context block.
 * v1: client supplies caseSnapshot + documents (because server has no DB yet).
 * Future: replace inputs with server-side DB lookups without changing callers.
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
    "THOXIE_CONTEXT_V1",
    line("caseId", safeStr(caseId) || "(none)"),
    line("role", safeStr(c.role)),
    line("category", safeStr(c.category)),
    line("county", safeStr(j.county)),
    line("courtName", safeStr(j.courtName)),
    line("caseNumber", safeStr(c.caseNumber)),
    line("hearingDate", safeStr(c.hearingDate)),
    line("hearingTime", safeStr(c.hearingTime)),
    line("amountClaimed", safeStr(c.amountClaimed)),
    line("factsSummary", safeStr(c.factsSummary))
  ].join("\n");

  const docs = Array.isArray(documents) ? documents : [];
  const docLines = docs.slice(0, 50).map((d, idx) => {
    const obj = d && typeof d === "object" ? d : {};
    const name = safeStr(obj.name) || safeStr(obj.filename) || `Document ${idx + 1}`;
    const kind = safeStr(obj.kind) || safeStr(obj.type) || "(unknown type)";
    const pages = safeNum(obj.pages);
    const uploadedAt = safeStr(obj.uploadedAt);
    return `- ${name} | ${kind}${pages ? ` | ${pages} pages` : ""}${uploadedAt ? ` | ${uploadedAt}` : ""}`;
  });

  const docBlock =
    docLines.length > 0
      ? ["DOCUMENT_INVENTORY", ...docLines].join("\n")
      : "DOCUMENT_INVENTORY\n- (no documents provided)";

  return `${header}\n\n${docBlock}`;
}

