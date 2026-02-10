import { z } from "zod";

/**
 * Canonical Case Schema
 * Used everywhere: intake, storage, dashboard, AI, documents
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

  status: z.enum(["draft", "ready", "filed"])
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
    status: "draft"
  });
}

