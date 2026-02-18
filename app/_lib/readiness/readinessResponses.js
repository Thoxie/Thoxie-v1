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

export function isReadinessIntent(lastUserText) {
  const t = String(lastUserText || "").toLowerCase();
  return (
    t.includes("readiness") ||
    t.includes("am i ready") ||
    t.includes("are we ready") ||
    t.includes("what's missing") ||
    t.includes("whats missing") ||
    t.includes("missing") ||
    t.includes("checklist") ||
    t.includes("next steps")
  );
}

