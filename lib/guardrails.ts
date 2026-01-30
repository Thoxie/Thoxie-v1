// PATH: lib/guardrails.ts

export type GuardrailContext = {
  module?: "family" | "dvro" | string;
};

const DVRO_BANNED_SUBSTRINGS = [
  // Keep intentionally small + obvious. Expand carefully.
  "kill",
  "shoot",
  "stab",
  "bomb",
  "I will hurt",
  "I’m going to hurt",
  "I'm going to hurt",
  "threaten to",
];

function includesAny(haystack: string, needles: string[]) {
  const t = haystack.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

/**
 * Lightweight safety guardrails.
 * - blocks obvious violence/threat intent
 * - provides a module-aware system preamble
 */
export function enforceGuardrails(args: {
  message: string;
  caseType?: string;
  context?: GuardrailContext;
}): { allowed: boolean; reason?: string; systemPreamble?: string } {
  const msg = (args.message ?? "").toString();

  if (includesAny(msg, DVRO_BANNED_SUBSTRINGS)) {
    return {
      allowed: false,
      reason:
        "Request contains threats or violence. Provide a factual, non-threatening description.",
    };
  }

  return {
    allowed: true,
    systemPreamble:
      "You are THOXIE. Provide neutral, structured legal decision-support guidance. Do not provide legal representation and do not assist wrongdoing.",
  };
}


