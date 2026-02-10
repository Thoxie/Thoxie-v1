// Path: /app/_schemas/caseSchema.js
import { z } from "zod";

/**
 * Canonical Case Schema
 * Used everywhere: intake, storage, dashboard, AI, documents
 *
 * Adds (optional, backward-compatible):
 * - caseNumber, filedDate, hearingDate, hearingTime
 * - serviceMethod, serverName, serviceDeadline, dateServed, proofOfServiceStatus
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
  hearingTime: z.string().optional(), // HH:MM

  // Service of process (tracking)
  serviceMethod: z.string().optional(),          // e.g., personal, substituted, sheriff, clerk mail (if allowed)
  serverName: z.string().optional(),             // person/company
  serviceDeadline: z.string().optional(),        // YYYY-MM-DD
  dateServed: z.string().optional(),             // YYYY-MM-DD
  proofOfServiceStatus: z.string().optional()    // not started | requested | served | POS filed
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

    status: "draft",
    caseNumber: "",
    filedDate: "",
    hearingDate: "",
    hearingTime: "",

    serviceMethod: "",
    serverName: "",
    serviceDeadline: "",
    dateServed: "",
    proofOfServiceStatus: ""
  });
}


