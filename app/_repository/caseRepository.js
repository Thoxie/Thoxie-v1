import { CaseSchema } from "../_schemas/caseSchema";

const STORAGE_KEY = "thoxie_cases";

/**
 * Case Repository (localStorage-backed)
 * Acts like a database layer.
 */

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return parsed.map(c => CaseSchema.parse(c));
  } catch {
    return [];
  }
}

function saveAll(cases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

export const CaseRepository = {
  getAll() {
    return loadAll();
  },

  getById(id) {
    return loadAll().find(c => c.id === id);
  },

  save(caseObj) {
    const cases = loadAll();
    const index = cases.findIndex(c => c.id === caseObj.id);

    const updated = {
      ...caseObj,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      cases[index] = updated;
    } else {
      cases.push(updated);
    }

    saveAll(cases);
    return updated;
  },

  delete(id) {
    const cases = loadAll().filter(c => c.id !== id);
    saveAll(cases);
  }
};

