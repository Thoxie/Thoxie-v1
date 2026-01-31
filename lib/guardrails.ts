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
 * Returns a GuardrailsResult indicating whether the message passes checks.
 */
export function enforceGuardrails(params: EnforceGuardrailsParams): GuardrailsResult {
  const { message = "", caseType = "family" } = params;

  // Block if message is empty
  if (!message || message.trim().length === 0) {
    return { allowed: false, reason: "Message is empty" };
  }

  // Simple blocklist example
  const blockedWords = ["badword1", "badword2"];
  const lowerMessage = message.toLowerCase();
  const foundBlocked = blockedWords.find(w => lowerMessage.includes(w));
  if (foundBlocked) {
    return { allowed: false, reason: `Message contains blocked word: ${foundBlocked}` };
  }

  // Example preamble
  const systemPreamble =
    caseType === "family"
      ? "You are a compassionate assistant providing family-oriented advice."
      : "You are a helpful assistant.";

  return { allowed: true, systemPreamble };
}
