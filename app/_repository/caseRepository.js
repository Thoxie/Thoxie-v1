// Path: /app/_repository/caseRepository.js

/**
 * CaseRepository (localStorage)
 *
 * Existing app usage:
 * - getAll(), getById(id), save(caseObj), delete(id)
 * - exportCase(id), importCase(jsonString)
 *
 * Added (local-first draft support for Intake Wizard):
 * - getDraft(caseId)
 * - saveDraft(caseId, draftData)
 * - clearDraft(caseId)
 *
 * Phase-1 (Single-case beta enforcement):
 * - Enforce at most ONE saved case in storage (updates allowed).
 * - Provide getActive() helpers so pages can resume consistently.
 */

const KEY = "thoxie.cases.v1";
const DRAFT_PREFIX = "thoxie.caseDraft.v1.";

// Beta mode default: ON.
// You can turn it off later by setting NEXT_PUBLIC_THOXIE_SINGLE_CASE_BETA="0".
function isSingleCaseBeta() {
  try {
    const v = (process?.env?.NEXT_PUBLIC_THOXIE_SINGLE_CASE_BETA ?? "").toString().trim();
    if (v === "0") return false;
    if (v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

function singleCaseCreateError() {
  return new Error(
    "Single-case beta: you can only have one case in this browser. Delete/Reset the existing case before creating a new one."
  );
}

export const CaseRepository = {
  getAll() {
    return readAll().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  },

  getActive() {
    const all = this.getAll();
    return all[0] || null;
  },

  getActiveId() {
    return this.getActive()?.id || "";
  },

  getById(id) {
    if (!id) return null;
    const all = readAll();
    return all.find((c) => c.id === id) || null;
  },

  save(c) {
    if (!c || !c.id) throw new Error("CaseRepository.save: case must have an id");

    const now = new Date().toISOString();
    const all = readAll();

    const next = {
      ...c,
      createdAt: c.createdAt || now,
      updatedAt: now
    };

    const idx = all.findIndex((x) => x.id === next.id);

    // Single-case beta enforcement:
    // - Updates are allowed (idx >= 0).
    // - Creating a NEW case (idx < 0) is blocked if one already exists.
    if (idx < 0 && isSingleCaseBeta() && all.length >= 1) {
      throw singleCaseCreateError();
    }

    if (idx >= 0) all[idx] = next;
    else all.push(next);

    writeAll(all);
    return next;
  },

  delete(id) {
    if (!id) return;
    const all = readAll().filter((c) => c.id !== id);
    writeAll(all);
    this.clearDraft(id);
  },

  exportCase(id) {
    const c = this.getById(id);
    if (!c) return "";
    return JSON.stringify(c, null, 2);
  },

  importCase(jsonString) {
    if (!jsonString || !jsonString.trim()) throw new Error("Import: empty JSON");

    // Single-case beta enforcement: importing creates a case record.
    // Allow import only if there is currently no case.
    if (isSingleCaseBeta()) {
      const existing = readAll();
      if (existing.length >= 1) throw singleCaseCreateError();
    }

    let obj;
    try {
      obj = JSON.parse(jsonString);
    } catch {
      throw new Error("Import: invalid JSON");
    }

    if (!obj || typeof obj !== "object") throw new Error("Import: JSON must be an object");

    const now = new Date().toISOString();
    const incomingId = typeof obj.id === "string" ? obj.id : "";

    const id = incomingId || (crypto?.randomUUID ? crypto.randomUUID() : `case-${Date.now()}`);

    const next = {
      ...obj,
      id,
      createdAt: typeof obj.createdAt === "string" && obj.createdAt ? obj.createdAt : now,
      updatedAt: now
    };

    return this.save(next);
  },

  // ----------------------------
  // Draft support (local-first)
  // ----------------------------
  getDraft(caseId) {
    if (!caseId) return null;
    try {
      const raw = localStorage.getItem(draftKey(caseId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (parsed.caseId !== caseId) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  saveDraft(caseId, draftData) {
    if (!caseId) return;
    try {
      const now = new Date().toISOString();
      const payload = {
        caseId,
        updatedAt: now,
        data: draftData && typeof draftData === "object" ? draftData : {}
      };
      localStorage.setItem(draftKey(caseId), JSON.stringify(payload));
      return payload;
    } catch {
      return null;
    }
  },

  clearDraft(caseId) {
    if (!caseId) return;
    try {
      localStorage.removeItem(draftKey(caseId));
    } catch {
      // ignore
    }
  }
};

function draftKey(caseId) {
  return `${DRAFT_PREFIX}${caseId}`;
}

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean).map((x) => (typeof x === "object" ? x : null)).filter(Boolean);
  } catch {
    return [];
  }
}

function writeAll(all) {
  localStorage.setItem(KEY, JSON.stringify(all));
}
