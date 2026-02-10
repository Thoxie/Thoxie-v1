// Path: /app/_schemas/caseSchema.js
import { z } from "zod";

/**
 * Canonical Case Schema
 * Used everywhere: intake, storage, dashboard, AI, documents
 *
 * New fields (optional, backward-compatible):
 * - caseNumber: court-assigned number after filing
 * - filedDate: YYYY-MM-DD (user-entered)
 * - hearingDate: YYYY-MM-DD (user-entered)
 * - hearingTime: HH:MM (user-entered, optional)
 *
 * Note: we keep your existing status enum as the "filing status" scaffold:
 * draft -> ready -> filed
 */

export const CaseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  jurisdiction: z.object({
    state: z.string(),
    county: z.string(),
    courtId: z.string(),
    courtName: z.string(),
    courtAddress: z.string()
  }),

  role: z.enum(["plaintiff", "defendant"]),
  category: z.string(),

  parties: z.object({
    plaintiff: z.string().optional(),
    defendant: z.string().optional()
  }),

  facts: z.string().optional(),
  damages: z.number().optional(),

  // Filing / lifecycle
  status: z.enum(["draft", "ready", "filed"]),
  caseNumber: z.string().optional(),
  filedDate: z.string().optional(),   // YYYY-MM-DD
  hearingDate: z.string().optional(), // YYYY-MM-DD
  hearingTime: z.string().optional()  // HH:MM
});

export function createEmptyCase(jurisdiction, role, category) {
  const now = new Date().toISOString();

  return CaseSchema.parse({
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    jurisdiction,
    role,
    category,
    parties: {},
    facts: "",
    damages: 0,

    // defaults
    status: "draft",
    caseNumber: "",
    filedDate: "",
    hearingDate: "",
    hearingTime: ""
  });
}

