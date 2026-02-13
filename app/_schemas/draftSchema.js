// Path: /app/_schemas/draftSchema.js
import { z } from "zod";

/**
 * Draft schema (local-first beta)
 * - Used for validating "saved drafts" that live in IndexedDB.
 * - Draft content is stored as plain text (deterministic v1).
 */

export const DraftSchema = z.object({
  draftId: z.string(),
  caseId: z.string(),

  createdAt: z.string(),
  updatedAt: z.string(),

  // Minimal metadata for v1 beta
  title: z.string().optional(),
  draftType: z.string().optional(), // e.g. "Small Claims Draft"
  format: z.string().optional(), // e.g. "text/plain", "text/markdown"

  // Draft body
  content: z.string()
});

export function safeValidateDraft(raw) {
  const res = DraftSchema.safeParse(raw);
  if (res.success) return { ok: true, data: res.data, errors: [] };

  const errors = (res.error?.issues || []).map((i) => {
    const path = Array.isArray(i.path) && i.path.length ? i.path.join(".") : "(root)";
    return `${path}: ${i.message}`;
  });

  return { ok: false, data: null, errors };
}

export function createDraftRecord({ caseId, title, draftType, format, content }) {
  const now = new Date().toISOString();
  return {
    draftId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`,
    caseId: String(caseId || ""),

    createdAt: now,
    updatedAt: now,

    title: title ? String(title) : "Draft",
    draftType: draftType ? String(draftType) : "Small Claims Draft",
    format: format ? String(format) : "text/plain",

    content: String(content || "")
  };
}

