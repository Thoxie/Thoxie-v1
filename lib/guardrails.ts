export type GuardrailsResult = {
  allowed: boolean;
  reason?: string;
  systemPreamble?: string;
};

export type EnforceGuardrailsParams = {
  message: string;
  caseType?: string;
};

/**
 * Basic enforceGuardrails implementation that always RETURNS a GuardrailsResult.
 * Replace or extend this with your real guardrail logic (async checks, API calls, DB lookups, etc.).
 */
export function enforceGuardrails(params: EnforceGuardrailsParams): GuardrailsResult {
  const { message = "", caseType = "family" } = params;

  if (!message || message.trim().length === 0) {
    return { allowed: false, reason: "Message is empty" };
  }

  // Example simple blocklist / heuristic checks (customize as needed)
  const blockedPhrases = ["badword1", "badword2", "do-not-allow"];
  const lower = message.toLowerCase();
  const blocked = blockedPhrases.find((p) => lower.includes(p));

  if (blocked) {
    return { allowed: false, reason: `Message contains disallowed content: ${blocked}` };
  }

  // Example system preamble by caseType
  const systemPreamble =
    caseType === "family"
      ? "You are a compassionate assistant providing family-oriented advice."
      : "You are a helpful assistant.";

  return { allowed: true, systemPreamble };
}
