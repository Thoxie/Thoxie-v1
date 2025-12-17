// lib/caseStore.ts

export type IntakePack =
  | "first_filing"
  | "hearing_prep"
  | "declaration_draft";

export type FamilyLawRole =
  | "Petitioner"
  | "Respondent"
  | "Other/Not sure";

export type EvidenceItem = {
  id: string;
  fileName: string;
  fileType?: string;
  notes?: string;
  issueTags?: string[];
  createdAtIso: string;
};

export type CaseIntake = {
  id: string;
  createdAtIso: string;

  // What they are preparing
  pack: IntakePack;

  // Core case info
  county: string;
  role: FamilyLawRole;

  // Hearing info
  hasHearing: boolean;
  hearingDateIso?: string;
  hearingType?: string;

  // User intent
  helpSummary?: string;

  // Evidence (metadata only for now)
  evidence: EvidenceItem[];
};

const STORAGE_KEY = "thoxie_case_v1";

export function loadCase(): CaseIntake | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CaseIntake) : null;
  } catch {
    return null;
  }
}

export function saveCase(caseData: CaseIntake) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(caseData));
}

export function newId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
