/* PATH: /app/_repository/caseRepository.js */
/* DIRECTORY: /app/_repository */
/* FILE: caseRepository.js */

const KEY = "thoxie.cases.v1";
const DRAFT_PREFIX = "thoxie.caseDraft.v1.";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isSingleCaseBeta() {
  try {
    const v = (process?.env?.NEXT_PUBLIC_THOXIE_SINGLE_CASE_BETA ?? "")
      .toString()
      .trim()
      .toLowerCase();

    if (v === "0") return false;
    if (v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

function singleCaseCreateError() {
  return new Error(
    "Single-case beta: you can only have one case in this browser. Delete or reset the existing case before creating a new one."
  );
}

function draftKey(caseId) {
  return `${DRAFT_PREFIX}${caseId}`;
}

function readAll() {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(Boolean)
      .map((x) => (typeof x === "object" ? x : null))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeAll(all) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(Array.isArray(all) ? all : []));
}

function sortByUpdatedDesc(items) {
  return [...items].sort((a, b) => (b?.updatedAt || "").localeCompare(a?.updatedAt || ""));
}

function upsertLocalCase(next) {
  if (!next || !next.id) return null;

  const all = readAll();
  const idx = all.findIndex((x) => x.id === next.id);

  if (idx < 0 && isSingleCaseBeta() && all.length >= 1) {
    throw singleCaseCreateError();
  }

  if (idx >= 0) all[idx] = next;
  else all.push(next);

  writeAll(all);
  return next;
}

function normalizeCasePayload(input) {
  if (!input || typeof input !== "object") return null;

  if (input.id) {
    return input;
  }

  if (input.case_data && typeof input.case_data === "object") {
    const data = input.case_data;
    return {
      ...data,
      id: data.id || input.case_id || "",
      createdAt: data.createdAt || input.created_at || "",
      updatedAt: data.updatedAt || input.updated_at || "",
    };
  }

  if (input.case && typeof input.case === "object") {
    return normalizeCasePayload(input.case);
  }

  return null;
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export const CaseRepository = {
  getAll() {
    return sortByUpdatedDesc(readAll());
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

  async loadActive() {
    return this.getActive();
  },

  async loadById(id) {
    if (!id) return null;

    const local = this.getById(id);

    try {
      const res = await fetch(`/api/case/load?caseId=${encodeURIComponent(id)}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        if (local) return local;
        throw new Error(json?.error || "Could not load case.");
      }

      const next = normalizeCasePayload(json?.case);

      if (!next) return local || null;

      upsertLocalCase(next);
      return next;
    } catch (error) {
      if (local) return local;
      throw error;
    }
  },

  async save(c) {
    if (!c || !c.id) throw new Error("CaseRepository.save: case must have an id");

    const now = new Date().toISOString();

    const next = {
      ...c,
      createdAt: c.createdAt || now,
      updatedAt: now,
    };

    const existing = readAll();
    const idx = existing.findIndex((x) => x.id === next.id);

    if (idx < 0 && isSingleCaseBeta() && existing.length >= 1) {
      throw singleCaseCreateError();
    }

    const res = await fetch("/api/case/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        caseId: next.id,
        caseData: next,
      }),
    });

    const json = await safeJson(res);

    if (!res.ok) {
      throw new Error(json?.error || "Could not save the case.");
    }

    const saved = normalizeCasePayload(json?.case) || next;
    upsertLocalCase(saved);
    return saved;
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
    const id =
      incomingId ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `case-${Date.now()}`);

    const next = {
      ...obj,
      id,
      createdAt: typeof obj.createdAt === "string" && obj.createdAt ? obj.createdAt : now,
      updatedAt: now,
    };

    upsertLocalCase(next);
    return next;
  },

  getDraft(caseId) {
    if (!caseId || !isBrowser()) return null;

    try {
      const raw = window.localStorage.getItem(draftKey(caseId));
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
    if (!caseId || !isBrowser()) return null;

    try {
      const now = new Date().toISOString();
      const payload = {
        caseId,
        updatedAt: now,
        data: draftData && typeof draftData === "object" ? draftData : {},
      };
      window.localStorage.setItem(draftKey(caseId), JSON.stringify(payload));
      return payload;
    } catch {
      return null;
    }
  },

  clearDraft(caseId) {
    if (!caseId || !isBrowser()) return;

    try {
      window.localStorage.removeItem(draftKey(caseId));
    } catch {
      // ignore
    }
  },
};
