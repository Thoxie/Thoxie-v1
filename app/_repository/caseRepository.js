// Path: /app/_repository/caseRepository.js

/**
 * CaseRepository (localStorage)
 *
 * Existing app usage:
 * - getAll(), getById(id), save(caseObj), delete(id)
 *
 * Added:
 * - exportCase(id): returns JSON string
 * - importCase(jsonString): saves case, returns saved case
 */

const KEY = "thoxie.cases.v1";

export const CaseRepository = {
  getAll() {
    return readAll().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
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
    if (idx >= 0) all[idx] = next;
    else all.push(next);

    writeAll(all);
    return next;
  },

  delete(id) {
    if (!id) return;
    const all = readAll().filter((c) => c.id !== id);
    writeAll(all);
  },

  exportCase(id) {
    const c = this.getById(id);
    if (!c) return "";
    return JSON.stringify(c, null, 2);
  },

  importCase(jsonString) {
    if (!jsonString || !jsonString.trim()) throw new Error("Import: empty JSON");

    let obj;
    try {
      obj = JSON.parse(jsonString);
    } catch {
      throw new Error("Import: invalid JSON");
    }

    if (!obj || typeof obj !== "object") throw new Error("Import: JSON must be an object");

    const now = new Date().toISOString();
    const incomingId = typeof obj.id === "string" ? obj.id : "";
    const existing = incomingId ? this.getById(incomingId) : null;

    const id = existing ? crypto.randomUUID() : (incomingId || crypto.randomUUID());

    const next = {
      ...obj,
      id,
      createdAt: typeof obj.createdAt === "string" && obj.createdAt ? obj.createdAt : now,
      updatedAt: now
    };

    return this.save(next);
  }
};

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
