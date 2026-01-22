// PATH: lib/caseTypes.ts
/**
 * Single source of truth for supported case types
 * Used by UI, API, and AI guardrails
 */

export const CASE_TYPES = [
  "FAMILY_LAW",
  "DVRO",
] as const;

export type CaseTypeId = (typeof CASE_TYPES)[number];

export const DEFAULT_CASE_TYPE: CaseTypeId = "FAMILY_LAW";

export const CASE_TYPE_LABELS: Record<CaseTypeId, string> = {
  FAMILY_LAW: "Family Law",
  DVRO: "DVRO (Domestic Violence Restraining Order)",
};

export function isCaseTypeId(v: unknown): v is CaseTypeId {
  return typeof v === "string" && (CASE_TYPES as readonly string[]).includes(v);
}

