// lib/caseStore.ts
"use client";

import { create } from "zustand";

type CaseStore = {
  county: string;
  caseStage: string;
  children: string;
  marriageYears: string;
  petitioner: string;
  income: string;
  assetsApprox: string;
  priority: string;
  notes: string;
  education: string;
  employment: string;

  setCounty: (v: string) => void;
  setCaseStage: (v: string) => void;
  setChildren: (v: string) => void;
  setMarriageYears: (v: string) => void;
  setPetitioner: (v: string) => void;
  setIncome: (v: string) => void;
  setAssetsApprox: (v: string) => void;
  setPriority: (v: string) => void;
  setNotes: (v: string) => void;
  setEducation: (v: string) => void;
  setEmployment: (v: string) => void;
};

export const useCaseStore = create<CaseStore>((set) => ({
  county: "San Mateo",
  caseStage: "Early / just starting",
  children: "No",
  marriageYears: "",
  petitioner: "Not sure",
  income: "",
  assetsApprox: "",
  priority: "Protect assets / fair division",
  notes: "",
  education: "",
  employment: "",

  setCounty: (v) => set({ county: v }),
  setCaseStage: (v) => set({ caseStage: v }),
  setChildren: (v) => set({ children: v }),
  setMarriageYears: (v) => set({ marriageYears: v }),
  setPetitioner: (v) => set({ petitioner: v }),
  setIncome: (v) => set({ income: v }),
  setAssetsApprox: (v) => set({ assetsApprox: v }),
  setPriority: (v) => set({ priority: v }),
  setNotes: (v) => set({ notes: v }),
  setEducation: (v) => set({ education: v }),
  setEmployment: (v) => set({ employment: v }),
}));


