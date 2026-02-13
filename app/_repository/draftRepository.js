// Path: /app/_repository/draftRepository.js
"use client";

/**
 * DraftRepository (IndexedDB, browser-local)
 * - Local-first storage for Draft records, keyed by draftId.
 * - Indexed by caseId for Case Hub retrieval.
 *
 * API:
 * - create(draft) -> saved record
 * - listByCaseId(caseId) -> drafts[]
 * - get(draftId) -> draft|null
 * - update(draftId, patch) -> saved draft|null
 * - delete(draftId)
 */

const DB_NAME = "thoxie_drafts";
const DB_VERSION = 1;

const STORE = "drafts";

export const DraftRepository = {
  async create(draft) {
    if (!draft || !draft.draftId) throw new Error("DraftRepository.create: missing draftId");
    if (!draft.caseId) throw new Error("DraftRepository.create: missing caseId");

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    store.put(draft);

    await promisifyTx(tx);
    db.close();
    return draft;
  },

  async listByCaseId(caseId) {
    if (!caseId) return [];
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("caseId");

    const rows = await promisifyRequest(index.getAll(String(caseId)));
    db.close();

    const arr = Array.isArray(rows) ? rows : [];
    // Most recent first
    arr.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return arr;
  },

  async get(draftId) {
    if (!draftId) return null;
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);

    const row = await promisifyRequest(store.get(String(draftId)));
    db.close();
    return row || null;
  },

  async update(draftId, patch = {}) {
    if (!draftId) return null;

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const row = await promisifyRequest(store.get(String(draftId)));
    if (!row) {
      db.close();
      return null;
    }

    const now = new Date().toISOString();
    const next = {
      ...row,
      ...patch,
      updatedAt: now
    };

    store.put(next);

    await promisifyTx(tx);
    db.close();
    return next;
  },

  async delete(draftId) {
    if (!draftId) return;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    store.delete(String(draftId));

    await promisifyTx(tx);
    db.close();
  }
};

async function openDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }

  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "draftId" });
        store.createIndex("caseId", "caseId", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open drafts DB"));
  });
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisifyTx(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onabort = () => reject(tx.error || new Error("DraftRepository transaction aborted"));
    tx.onerror = () => reject(tx.error || new Error("DraftRepository transaction error"));
  });
}

