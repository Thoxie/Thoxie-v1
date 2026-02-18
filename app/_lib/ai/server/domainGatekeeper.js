// Path: /app/_lib/ai/server/domainGatekeeper.js

/**
 * THOXIE Domain Gatekeeper v1
 *
 * Classifies the user's intent BEFORE any AI or business logic runs.
 * Keeps system focused on CA small-claims assistance.
 */

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

const LEGAL_KEYWORDS = [
  "sue", "lawsuit", "small claims", "claim", "court", "judge",
  "hearing", "defendant", "plaintiff", "evidence", "file",
  "service", "complaint", "damages", "settlement",
  "legal", "law", "statute", "case", "dispute",
  "refund", "invoice", "contract", "landlord", "tenant"
];

const ADMIN_ALLOWED = [
  "login", "account", "password", "delete case", "export",
  "upload", "document", "file size", "technical issue",
  "bug", "not working"
];

const CLEARLY_OFFTOPIC = [
  "restaurant", "pizza", "burger", "food", "hotel", "flight",
  "weather", "sports", "movie", "tv", "celebrity", "dating",
  "games", "music", "shopping", "car repair near me",
  "directions", "map", "tourist"
];

export function classifyMessage(text) {
  const t = norm(text);

  if (!t) return { type: "empty" };

  if (CLEARLY_OFFTOPIC.some((k) => t.includes(k))) {
    return { type: "off_topic" };
  }

  if (ADMIN_ALLOWED.some((k) => t.includes(k))) {
    return { type: "admin" };
  }

  if (LEGAL_KEYWORDS.some((k) => t.includes(k))) {
    return { type: "legal" };
  }

  // Default: treat as ambiguous but allowed legal workflow
  return { type: "uncertain" };
}

