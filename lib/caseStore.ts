// lib/caseStore.ts

export type IntakeTask =
  | "start_divorce"
  | "respond_papers"
  | "prepare_hearing"
  | "written_statement"
  | "triage";

export type FamilyLawRole = "Petitioner" | "Respondent" | "Other/Not sure";

export type EducationLevel =
  | "Less than high school"
  | "High school / GED"
  | "Some college"
  | "College degree"
  | "Graduate degree";

export type EmploymentStatus =
  | "Employed (office / professional)"
  | "Employed (hourly / shift-based)"
  | "Self-employed"
  | "Not currently working"
  | "Retired";

export type IncomeRange =
  | "Under $50,000"
  | "$50,000–$100,000"
  | "$100,000–$200,000"
  | "Over $200,000"
  | "Prefer not to say";

export type EvidenceSide = "mine" | "other_party";
export type EvidenceKind = "file" | "text";

export type EvidenceItem = {
  id: string;
  side: EvidenceSide;
  kind: EvidenceKind;

  // If kind === "file"
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  dbKey?: string; // IndexedDB key

  // If kind === "text"
  textTitle?: string;
  textBody?: string;

  notes?: string;
  issueTags?: string[];
  createdAtIso: string;
};

export type CaseIntake = {
  id: string;
  createdAtIso: string;

  // Task selection
  task: IntakeTask;

  // Core case info
  county: string;
  role: FamilyLawRole;

  // Optional hearing info
  hasHearing: boolean;
  hearingDateIso?: string;

  // Optional one-sentence goal
  helpSummary?: string;

  // Demographics (education + employment required; income optional)
  education?: EducationLevel;
  employment?: EmploymentStatus;
  income?: IncomeRange;

  // Quick “what issues apply?”
  issues?: string[];

  // Evidence list
  evidence: EvidenceItem[];
};

const STORAGE_KEY = "thoxie_case_v2";

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
