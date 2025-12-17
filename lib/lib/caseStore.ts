// lib/caseStore.ts
export type IntakePack = "first_filing" | "hearing_prep" | "declaration_draft";

export type FamilyLawRole = "Petitioner" | "Respondent" | "Other/Not sure";

export type EvidenceItem = {
  id: string;
  fileName: string;
  fileType?: string;
  notes?: string;
  issueTags?: string[]; // e.g., ["custody", "support"]
  createdAtIso: string;
};

export type CaseIntake = {
  id: string;
  createdAtIso: string;
  pack: IntakePack;

  // Core
  county: string;
  role: FamilyLawRole;

  // Pack-specific
  hasHearing: boolean;
  hearingDateIso?: string; // YYYY-MM-DD
  hearingType?: string; // e.g., RFO, DVRO, OSC, etc.

  // User goals
  helpSummary?: string;

  // Evidence (metadata only for now)
  evidence: EvidenceItem[];
};

const KEY = "thoxie_case_v1";

export function loadCase(): CaseIntake | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CaseIntake;
  } catch {
    return null;
  }
}

export function saveCase(data: CaseIntake) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function newId(prefix = "case") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

