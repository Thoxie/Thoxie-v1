// Path: /app/_repository/documentRepository.js
"use client";

/*
  CRITICAL EXPORT FIX
  -------------------
  This file MUST export a named export:

      export const DocumentRepository = { ... }

  Many parts of the app import it as:
      import { DocumentRepository } from "../_repository/documentRepository";

  If this is not a named export, the entire app breaks.
*/

const DB_NAME = "thoxie_documents";
const DB_VERSION = 1;
const STORE = "documents";

/* =========================================================
   INTERNAL HELPERS
========================================================= */

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "docId" });
        store.createIndex("caseId", "caseId", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function id() {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* =========================================================
   NAMED EXPORT (CRITICAL)
========================================================= */

export const DocumentRepository = {
  async addFiles(caseId, files, { docType = "evidence" } = {}) {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const now = new Date().toISOString();

    const list = Array.from(files || []);
    for (const file of list) {
      store.put({
        docId: id(),
        caseId: String(caseId),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: now,
        docType,
        docTypeLabel: null,
        exhibitDescription: "",
        extractedText: "",
        blob: file,
      });
    }

    return new Promise((res, rej) => {
      tx.oncomplete = () => {
        db.close();
        res(true);
      };
      tx.onerror = () => rej(tx.error);
    });
  },

  async listByCaseId(caseId) {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("caseId");

    const req = index.getAll(String(caseId));

    return new Promise((res, rej) => {
      req.onsuccess = () => {
        db.close();
        res(req.result || []);
      };
      req.onerror = () => rej(req.error);
    });
  },

  async get(docId) {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);

    const req = store.get(docId);

    return new Promise((res, rej) => {
      req.onsuccess = () => {
        db.close();
        res(req.result || null);
      };
      req.onerror = () => rej(req.error);
    });
  },

  async getObjectUrl(docId) {
    const doc = await this.get(docId);
    if (!doc?.blob) return null;
    return URL.createObjectURL(doc.blob);
  },

  async updateMetadata(docId, patch = {}) {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const current = await new Promise((res, rej) => {
      const req = store.get(docId);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

    if (!current) return null;

    const updated = {
      ...current,
      ...patch,
    };

    store.put(updated);

    return new Promise((res, rej) => {
      tx.oncomplete = () => {
        db.close();
        res(updated);
      };
      tx.onerror = () => rej(tx.error);
    });
  },

  async delete(docId) {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.delete(docId);

    return new Promise((res, rej) => {
      tx.oncomplete = () => {
        db.close();
        res(true);
      };
      tx.onerror = () => rej(tx.error);
    });
  },
};
