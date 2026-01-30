// PATH: lib/guardrails.ts

export type GuardrailsResult = {
  allowed: boolean;
  reason?: string;
  systemPreamble?: string;
};

const BLOCKED_SUBSTRINGS = [
  "how do i get away with",
  "plant evidence",
  "destroy evidence",
  "hide evidence",
  "forge",
  "fake",
  "blackmail",
  "extort",
];

function includesAny(text: string, needles: string[]) {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

/**
 * Family-law only guardrails (DVRO removed).
 * Returns an object compatible with app/api/chat/route.ts.
 */
export function enforceGuardrails(args: {
  message: string;
  caseType?: string;
}): GuardrailsResult {
  const message = (args.message ?? "").toString();

  if (includesAny(message, BLOCKED_SUBSTRINGS)) {
    return {
      allowed: false,
      reason: "Request blocked by guardrails.",
      systemPreamble:
        "You are THOXIE (Family Law). Provide neutral, structured legal decision-support guidance. Do not assist wrongdoing, deception, harassment, or evidence manipulation. Do not provide legal representation.",
    };
  }

  return {
    allowed: true,
    systemPreamble:
      "You are THOXIE (Family Law). Provide neutral, structured legal decision-support guidance. Do not provide legal representation.",
  };
}


