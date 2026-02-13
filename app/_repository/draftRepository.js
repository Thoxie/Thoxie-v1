// Path: /app/_repository/draftRepository.js
"use client";

const DB_NAME = "thoxie_drafts";
const DB_VERSION = 1;
const STORE = "drafts";

export const DraftRepository = {
  async create(draft) {
    if (!draft?.draftId || !draft?.caseId) throw new Error("Invalid draft");

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(draft);
    await promisifyTx(tx);
    db.close();

    return draft;
  },

  async listByCaseId(caseId) {
    if (!caseId) return [];

    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("caseId");

    const rows = await promisifyRequest(index.getAll(String(caseId)));
    db.close();

    const arr = Array.isArray(rows) ? rows : [];
    arr.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return arr;
  },

  async search(caseId, query) {
    const all = await this.listByCaseId(caseId);
    if (!query) return all;

    const q = query.toLowerCase();
    return all.filter(
      (d) =>
        (d.title || "").toLowerCase().includes(q) ||
        (d.content || "").toLowerCase().includes(q)
    );
  },

  async get(draftId) {
    if (!draftId) return null;

    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const result = await promisifyRequest(
      tx.objectStore(STORE).get(String(draftId))
    );
    db.close();

    return result || null;
  },

  async update(draftId, patch = {}) {
    if (!draftId) return null;

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const existing = await promisifyRequest(store.get(String(draftId)));
    if (!existing) {
      db.close();
      return null;
    }

    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    store.put(updated);
    await promisifyTx(tx);
    db.close();

    return updated;
  },

  async duplicate(draftId) {
    const original = await this.get(draftId);
    if (!original) return null;

    const copy = {
      ...original,
      draftId: crypto.randomUUID(),
      title: original.title + " (Copy)",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.create(copy);
  },

  async delete(draftId) {
    if (!draftId) return;

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(String(draftId));

    await promisifyTx(tx);
    db.close();
  },
};

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "draftId" });
        store.createIndex("caseId", "caseId", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}


