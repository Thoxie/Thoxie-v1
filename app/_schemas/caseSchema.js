// Path: /app/_schemas/caseSchema.js
import { z } from "zod";

/**
 * Case schema:
 * - Validates the saved case record in CaseRepository
 * - Drafts are partial and validated in the UI before save
 */

export const CaseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  status: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),

  jurisdiction: z
    .object({
      state: z.string().optional(), // e.g., "CA"
      county: z.string().optional(),
      courtId: z.string().optional(),
      courtName: z.string().optional(),
      courtAddress: z.string().optional(),
      clerkUrl: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  parties: z
    .object({
      plaintiff: z.string().optional(),
      defendant: z.string().optional(),

      plaintiffAddress: z.string().optional(),
      plaintiffPhone: z.string().optional(),
      plaintiffEmail: z.string().optional(),

      defendantAddress: z.string().optional(),
      defendantPhone: z.string().optional(),
      defendantEmail: z.string().optional(),

      additionalPlaintiffs: z.array(z.string()).optional(),
      additionalDefendants: z.array(z.string()).optional(),
    })
    .optional(),

  damages: z.union([z.number(), z.string()]).optional(),

  claim: z
    .object({
      amount: z.union([z.number(), z.string()]).optional(),
      reason: z.string().optional(),
      where: z.string().optional(),
      incidentDate: z.string().optional(),

      defendantIsPublicEntity: z.boolean().optional(),
      involvesVehicle: z.boolean().optional(),
      involvesContract: z.boolean().optional(),
      plaintiffUsesDba: z.boolean().optional(),
    })
    .optional(),

  service: z
    .object({
      method: z.string().optional(), // "personal" | "substituted" | "mail" | "posting" | ""
    })
    .optional(),

  feeWaiver: z
    .object({
      requested: z.boolean().optional(),
    })
    .optional(),

  facts: z.string().optional(),

  factsItems: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        date: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .optional(),

  caseNumber: z.string().optional(),
  filedDate: z.string().optional(),
  hearingDate: z.string().optional(),
  hearingTime: z.string().optional(),

  courtNoticeText: z.string().optional(),
});

export function createEmptyCase() {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `case-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    role: "plaintiff",

    jurisdiction: {
      state: "CA",
      county: "",
      courtId: "",
      courtName: "",
      courtAddress: "",
      clerkUrl: "",
      notes: "",
    },

    parties: {
      plaintiff: "",
      defendant: "",
      plaintiffAddress: "",
      plaintiffPhone: "",
      plaintiffEmail: "",
      defendantAddress: "",
      defendantPhone: "",
      defendantEmail: "",
      additionalPlaintiffs: [],
      additionalDefendants: [],
    },

    damages: "",

    claim: {
      amount: "",
      reason: "",
      where: "",
      incidentDate: "",
      defendantIsPublicEntity: false,
      involvesVehicle: false,
      involvesContract: false,
      plaintiffUsesDba: false,
    },

    service: {
      method: "",
    },

    feeWaiver: {
      requested: false,
    },

    facts: "",
    factsItems: [],
    caseNumber: "",
    filedDate: "",
    hearingDate: "",
    hearingTime: "",
    courtNoticeText: "",
  };
}


