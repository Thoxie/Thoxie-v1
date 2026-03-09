/* 1. PATH: app/_lib/ai/server/domainGatekeeper.js */
/* 1. FILE: domainGatekeeper.js */
/* 1. ACTION: OVERWRITE */

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

const LEGAL_KEYWORDS = [
  "sue", "lawsuit", "small claims", "claim", "court", "judge",
  "hearing", "defendant", "plaintiff", "evidence", "file",
  "service", "complaint", "damages", "settlement",
  "legal", "law", "statute", "case", "dispute",
  "refund", "invoice", "contract", "landlord", "tenant",
  "summarize", "summary", "exhibit", "attachment", "attached"
];

const DOCUMENT_ANALYSIS_KEYWORDS = [
  "document", "documents", "uploaded", "upload", "file", "files",
  "attachment", "attached", "exhibit", "summarize", "summary",
  "what does it say", "what does this say", "what is in the document",
  "what does the document include", "what does the uploaded document include",
  "review this document", "analyze this document", "analyse this document"
];

const ADMIN_ALLOWED = [
  "login", "account", "password", "delete case", "export",
  "file size", "technical issue", "bug", "not working",
  "can’t upload", "cannot upload", "upload failed", "upload error"
];

const CLEARLY_OFFTOPIC = [
  "restaurant", "pizza", "burger", "food", "hotel", "flight",
  "weather", "sports", "movie", "tv", "celebrity", "dating",
  "games", "music", "shopping", "car repair near me",
  "directions", "map", "tourist"
];

export function isDocumentAnalysisIntent(text) {
  const t = norm(text);
  if (!t) return false;
  return DOCUMENT_ANALYSIS_KEYWORDS.some((k) => t.includes(k));
}

export function isAdminIntent(text) {
  const t = norm(text);
  if (!t) return false;
  return ADMIN_ALLOWED.some((k) => t.includes(k));
}

export function classifyMessage(text) {
  const t = norm(text);

  if (!t) return { type: "empty" };

  if (CLEARLY_OFFTOPIC.some((k) => t.includes(k))) {
    return { type: "off_topic" };
  }

  // Important rule:
  // Document questions must be treated as legal/evidence workflow,
  // not as admin/support questions.
  if (isDocumentAnalysisIntent(t)) {
    return { type: "legal_document" };
  }

  if (LEGAL_KEYWORDS.some((k) => t.includes(k))) {
    return { type: "legal" };
  }

  if (isAdminIntent(t)) {
    return { type: "admin" };
  }

  return { type: "uncertain" };
}

