// Path: /app/_schemas/caseSchema.js
import { z } from "zod";

export const CaseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  status: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),

  jurisdiction: z
    .object({
      county: z.string().optional(),
      courtName: z.string().optional(),
      courtAddress: z.string().optional(),
      clerkUrl: z.string().optional(),
      notes: z.string().optional()
    })
    .optional(),

  parties: z
    .object({
      plaintiff: z.string().optional(),
      defendant: z.string().optional()
    })
    .optional(),

  damages: z.union([z.number(), z.string()]).optional(),

  // Freeform narrative (legacy / optional)
  facts: z.string().optional(),

  // NEW: structured facts (bullets)
  factsItems: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        date: z.string().optional(),
        source: z.string().optional()
      })
    )
    .optional(),

  caseNumber: z.string().optional(),
  filedDate: z.string().optional(),
  hearingDate: z.string().optional(),
  hearingTime: z.string().optional(),

  // Documents page: pasted/OCR notice text
  courtNoticeText: z.string().optional()
});

export function createEmptyCase() {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `case-${Date.now()}`,
    createdAt: now,
    updatedAt: now,

    status: "draft",
    role: "plaintiff",
    category: "",

    jurisdiction: {
      county: "",
      courtName: "",
      courtAddress: "",
      clerkUrl: "",
      notes: ""
    },

    parties: {
      plaintiff: "",
      defendant: ""
    },

    damages: "",

    facts: "",
    factsItems: [],

    caseNumber: "",
    filedDate: "",
    hearingDate: "",
    hearingTime: "",

    courtNoticeText: ""
  };
}

export function validateCase(raw) {
  const res = CaseSchema.safeParse(raw);
  if (!res.success) return null;
  return res.data;
}
