// Path: /app/_lib/ai/server/domainGatekeeper.js

/**
 * THOXIE Domain Gatekeeper v1 (tuned)
 *
 * Goal: keep THOXIE focused on CA small-claims while avoiding false "admin/tech support"
 * routing when a user asks about a DOCUMENT'S CONTENT.
 *
 * Key fix:
 * - "document" alone is NOT an admin signal.
 * - Admin intent requires "document" + an explicit technical failure signal (sync/upload/bug/not working).
 */

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

const LEGAL_KEYWORDS = [
  "sue", "lawsuit", "small claims", "claim", "court", "judge",
  "hearing", "defendant", "plaintiff", "evidence", "file",
  "service", "complaint", "damages", "settlement",
  "legal", "law", "statute", "case", "dispute",
  "refund", "invoice", "contract", "landlord", "tenant",
  // Document-content intent signals (important)
  "summarize", "summary", "analyze", "analysis", "what does this say",
  "what do you make of", "explain this document", "review this document",
  "key points", "highlights", "what are the issues", "what should i do"
];

// Admin/technical intent requires explicit technical context.
const TECH_SIGNALS = [
  "sync", "sync failed", "upload", "download", "not working",
  "bug", "error", "crash", "broken", "server failure", "timeout",
  "file size", "too large", "429", "403"
];

// Admin topics (but only treated as admin when paired with TECH_SIGNALS)
const ADMIN_TOPICS = [
  "login", "account", "password", "delete case", "export",
  "webhook", "rate limit", "kill switch", "deployment", "vercel"
];

const CLEARLY_OFFTOPIC = [
  "restaurant", "bar", "hotel", "flight", "weather", "sports",
  "stock", "crypto", "politics", "celebrity", "joke"
];

function containsAny(text, arr) {
  return arr.some((k) => text.includes(k));
}

function isEmpty(text) {
  return !text || !text.trim();
}

/**
 * classifyMessage(message, context)
 * context can include: { hasCaseSelected, hasDocuments }
 */
export function classifyMessage(message, context = {}) {
  const t = norm(message);

  if (isEmpty(t)) return { intent: "empty" };

  // If the user is clearly asking about the content of a document,
  // treat as legal/document analysis (NOT admin).
  const docContentAsk =
    t.includes("document") &&
    (containsAny(t, ["summarize", "summary", "analyze", "analysis", "what do you make of", "what does this say", "explain", "review", "key points"]));

  if (docContentAsk) return { intent: "legal" };

  // Admin intent: must include technical signal OR admin topic, and not be a doc-content ask.
  const hasTech = containsAny(t, TECH_SIGNALS);
  const hasAdminTopic = containsAny(t, ADMIN_TOPICS);

  // If user says "document" but also says "not working / sync failed / upload error", that's admin/tech.
  const docTech = t.includes("document") && hasTech;

  if (docTech || (hasTech && hasAdminTopic) || (hasAdminTopic && t.includes("how do i"))) {
    return { intent: "admin" };
  }

  // Strong off-topic filter
  if (containsAny(t, CLEARLY_OFFTOPIC)) return { intent: "off_topic" };

  // If we have a case selected or documents exist, bias toward legal (product expectation).
  const hasCaseSelected = !!context.hasCaseSelected;
  const hasDocuments = !!context.hasDocuments;
  if (hasCaseSelected || hasDocuments) return { intent: "legal" };

  // Default: legal if it looks remotely case-related.
  if (containsAny(t, LEGAL_KEYWORDS)) return { intent: "legal" };

  // Otherwise keep the product on mission.
  return { intent: "off_topic" };
}
