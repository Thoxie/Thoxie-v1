// Path: /app/_repository/caseRepository.js

/**
 * CaseRepository (localStorage)
 *
 * Design goals:
 * - Stable API used across the app
 * - Backward-compatible with older stored data
 * - Always updates updatedAt on save
 *
 * Supported methods (current app usage):
 * - getAll()
 * - getById(id)
 * - save(caseObj)
 * - delete(id)
 *
 * Extra convenience methods (safe to use later):
 * - clearAll()
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
      // preserve createdAt if present; otherwise initialize
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

  clearAll() {
    localStorage.removeItem(KEY);
  }
};

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // ensure objects
    return parsed.filter(Boolean).map((x) => (typeof x === "object" ? x : null)).filter(Boolean);
  } catch {
    return [];
  }
}

function writeAll(all) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

