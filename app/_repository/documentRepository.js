// Path: /app/_repository/documentRepository.js
"use client";

/**
 * DocumentRepository (v1)
 * - Stores uploaded files per case in IndexedDB (so we can keep real PDFs/images)
 * - Stores lightweight metadata in IndexedDB too (queriable by caseId)
 *
 * Why IndexedDB (not localStorage):
 * - localStorage is tiny and will break for PDFs/images
 * - IndexedDB is designed for blobs/files in-browser
 *
 * NOTE: This is still “local to the device/browser” for now.
 * Later we can swap storage to Vercel Blob/Postgres without changing UI flow.
 */

const DB_NAME = "thoxie_docs_db";
const DB_VERSION = 1;
const STORE = "documents";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "docId" });
        store.createIndex("caseId", "caseId", { unique: false });
        store.createIndex("uploadedAt", "uploadedAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);

    Promise.resolve()
      .then(() => fn(store))
      .then((result) => {
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
      .catch((err) => {
        try {
          tx.abort();
        } catch (_) {}
        reject(err);
      });
  });
}

function makeId() {
  // crypto.randomUUID is supported in modern browsers; fallback included.
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const DocumentRepository = {
  /**
   * Add multiple files to a case.
   * Returns metadata array.
   */
  async addFiles(caseId, files) {
    if (!caseId) throw new Error("Missing caseId");
    if (!files || files.length === 0) return [];

    const db = await openDb();
    const now = new Date().toISOString();

    const docs = Array.from(files).map((file) => {
      const docId = makeId();
      return {
        docId,
        caseId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : "",
        uploadedAt: now,
        // Store the actual file blob
        blob: file
      };
    });

    await runTx(db, "readwrite", async (store) => {
      for (const d of docs) {
        store.put(d);
      }
      return true;
    });

    return docs.map(stripBlob);
  },

  /**
   * List document metadata for a case.
   */
  async listByCaseId(caseId) {
    if (!caseId) return [];
    const db = await openDb();

    return runTx(db, "readonly", async (store) => {
      const index = store.index("caseId");
      const req = index.getAll(caseId);
      const rows = await txRequest(req);
      const meta = (rows || []).map(stripBlob);
      // newest first
      meta.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
      return meta;
    });
  },

  /**
   * Get a single document record (including blob).
   */
  async get(docId) {
    if (!docId) return null;
    const db = await openDb();

    return runTx(db, "readonly", async (store) => {
      const req = store.get(docId);
      const row = await txRequest(req);
      return row || null;
    });
  },

  /**
   * Download/open a document by returning an object URL.
   * Caller should URL.revokeObjectURL when done.
   */
  async getObjectUrl(docId) {
    const doc = await this.get(docId);
    if (!doc || !doc.blob) return null;
    return URL.createObjectURL(doc.blob);
  },

  /**
   * Delete one doc.
   */
  async delete(docId) {
    if (!docId) return;
    const db = await openDb();

    return runTx(db, "readwrite", async (store) => {
      store.delete(docId);
      return true;
    });
  },

  /**
   * Delete all docs for a case.
   */
  async deleteByCaseId(caseId) {
    if (!caseId) return;
    const db = await openDb();

    return runTx(db, "readwrite", async (store) => {
      const index = store.index("caseId");
      const req = index.getAllKeys(caseId);
      const keys = await txRequest(req);

      for (const k of keys || []) {
        store.delete(k);
      }
      return true;
    });
  }
};

function stripBlob(d) {
  if (!d) return d;
  const { blob, ...rest } = d;
  return rest;
}

