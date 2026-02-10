// Path: /app/_schemas/caseSchema.js
import { z } from "zod";

/**
 * Canonical Case Schema
 * Used everywhere: intake, storage, dashboard, AI, documents
 *
 * Key Dates (optional, backward-compatible):
 * - filedDate
 * - hearingDate / hearingTime
 * - serviceDeadline / dateServed
 * - trialDate / trialTime (some courts label the hearing as "trial"; we store both)
 * - depositionDate / depositionTime (future-proof; not always used in small claims)
 * - otherDateLabel / otherDate / otherTime (one flexible slot)
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

  // Key dates
  filedDate: z.string().optional(),        // YYYY-MM-DD
  hearingDate: z.string().optional(),      // YYYY-MM-DD
  hearingTime: z.string().optional(),      // HH:MM

  serviceDeadline: z.string().optional(),  // YYYY-MM-DD
  dateServed: z.string().optional(),       // YYYY-MM-DD

  trialDate: z.string().optional(),        // YYYY-MM-DD
  trialTime: z.string().optional(),        // HH:MM

  depositionDate: z.string().optional(),   // YYYY-MM-DD
  depositionTime: z.string().optional(),   // HH:MM

  otherDateLabel: z.string().optional(),
  otherDate: z.string().optional(),        // YYYY-MM-DD
  otherTime: z.string().optional(),        // HH:MM

  // Service of process (tracking)
  serviceMethod: z.string().optional(),
  serverName: z.string().optional(),
  proofOfServiceStatus: z.string().optional()
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
    proofOfServiceStatus: "",

    trialDate: "",
    trialTime: "",

    depositionDate: "",
    depositionTime: "",

    otherDateLabel: "",
    otherDate: "",
    otherTime: ""
  });
}
