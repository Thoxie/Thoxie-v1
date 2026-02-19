// Path: /app/_lib/readiness/readinessResponses.js

function bullet(lines) {
  if (!lines || lines.length === 0) return "- (none)";
  return lines.map((x) => `- ${x}`).join("\n");
}

export function formatReadinessResponse(result) {
  const r = result || {};
  const score = typeof r.readiness_score === "number" ? r.readiness_score : 0;

  const required = Array.isArray(r.missing_required) ? r.missing_required : [];
  const recommended = Array.isArray(r.missing_recommended) ? r.missing_recommended : [];
  const actions = Array.isArray(r.next_actions) ? r.next_actions : [];
  const notes = Array.isArray(r.jurisdiction_notes) ? r.jurisdiction_notes : [];

  return [
    `READINESS_SCORE: ${score}/100`,
    "",
    "MISSING_REQUIRED:",
    bullet(required),
    "",
    "MISSING_RECOMMENDED:",
    bullet(recommended),
    "",
    "NEXT_ACTIONS:",
    bullet(actions),
    "",
    "JURISDICTION_NOTES:",
    bullet(notes)
  ].join("\n");
}

/**
 * Readiness should run ONLY when the user is explicitly asking for readiness,
 * not just because they used words like “checklist” inside a legal question.
 */
export function isReadinessIntent(lastUserText) {
  const t = String(lastUserText || "").trim().toLowerCase();
  if (!t) return false;

  // Explicit “commands” (cheap + unambiguous)
  if (t === "readiness" || t === "readiness check" || t.startsWith("readiness:") || t.startsWith("/readiness")) {
    return true;
  }

  // Explicit phrases
  return (
    t.includes("am i ready") ||
    t.includes("are we ready") ||
    t.includes("ready to file") ||
    t.includes("ready for filing") ||
    t.includes("check my readiness") ||
    t.includes("check readiness") ||
    t.includes("what's missing for filing") ||
    t.includes("whats missing for filing") ||
    t.includes("what's missing to file") ||
    t.includes("whats missing to file") ||
    t.includes("what's missing for the filing") ||
    t.includes("whats missing for the filing")
  );
}

