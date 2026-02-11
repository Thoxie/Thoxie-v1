// Path: /app/_repository/documentRepository.js
"use client";

const DB_NAME = "thoxie_docs";
const DB_VERSION = 1;

const STORE = "documents";

export const DocumentRepository = {
  async addFiles(caseId, files, options = {}) {
    if (!caseId) throw new Error("Missing caseId");
    const list = Array.from(files || []);
    if (list.length === 0) return [];

    // IMPORTANT: compute next order BEFORE opening a readwrite transaction
    // because IndexedDB transactions auto-finish if you await between requests.
    const existing = await this.listByCaseId(caseId);
    const maxOrder = (existing || []).reduce((m, d) => Math.max(m, Number(d.order || 0)), 0);

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const created = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const docId = crypto.randomUUID();

      const rec = {
        docId,
        caseId,
        name: file.name || "Untitled",
        size: file.size || 0,
        mimeType: file.type || "application/octet-stream",
        docType: normalizeDocType(options?.docType),

        // Optional metadata used by UI
        exhibitDescription: "",
        extractedText: "",

        uploadedAt: Date.now(),
        order: maxOrder + i + 1,

        // The actual file blob
        blob: file
      };

      store.put(rec);
      created.push(rec);
    }

    await promisifyTx(tx);
    db.close();

    return created;
  },

  async listByCaseId(caseId) {
    if (!caseId) return [];
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("caseId");

    const rows = await promisifyRequest(index.getAll(caseId));
    db.close();

    const arr = Array.isArray(rows) ? rows : [];
    arr.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    return arr;
  },

  async get(docId) {
    if (!docId) return null;
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const row = await promisifyRequest(store.get(docId));
    db.close();
    return row || null;
  },

  async delete(docId) {
    if (!docId) return;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.delete(docId);
    await promisifyTx(tx);
    db.close();
  },

  async updateExtractedText(docId, text) {
    if (!docId) return;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const row = await promisifyRequest(store.get(docId));
    if (!row) {
      db.close();
      return;
    }

    row.extractedText = String(text || "");
    store.put(row);

    await promisifyTx(tx);
    db.close();
  },

  async updateMetadata(docId, patch = {}) {
    if (!docId) return;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const row = await promisifyRequest(store.get(docId));
    if (!row) {
      db.close();
      return;
    }

    const next = {
      ...row,
      ...patch
    };

    // Keep docType normalized if provided
    if (Object.prototype.hasOwnProperty.call(patch, "docType")) {
      next.docType = normalizeDocType(patch.docType);
    }

    store.put(next);
    await promisifyTx(tx);
    db.close();
  },

  async moveUp(caseId, docId) {
    if (!caseId || !docId) return;
    const docs = await this.listByCaseId(caseId);
    const idx = docs.findIndex((d) => d.docId === docId);
    if (idx <= 0) return;

    const a = docs[idx - 1];
    const b = docs[idx];

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const tmp = a.order;
    a.order = b.order;
    b.order = tmp;

    store.put(a);
    store.put(b);

    await promisifyTx(tx);
    db.close();
  },

  async moveDown(caseId, docId) {
    if (!caseId || !docId) return;
    const docs = await this.listByCaseId(caseId);
    const idx = docs.findIndex((d) => d.docId === docId);
    if (idx < 0 || idx >= docs.length - 1) return;

    const a = docs[idx];
    const b = docs[idx + 1];

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const tmp = a.order;
    a.order = b.order;
    b.order = tmp;

    store.put(a);
    store.put(b);

    await promisifyTx(tx);
    db.close();
  },

  async getObjectUrl(docId) {
    const row = await this.get(docId);
    if (!row || !row.blob) return "";
    return URL.createObjectURL(row.blob);
  }
};

function normalizeDocType(t) {
  const v = String(t || "").toLowerCase().trim();
  if (v === "court_filing") return "court_filing";
  if (v === "correspondence") return "correspondence";
  if (v === "photo") return "photo";
  if (v === "other") return "other";
  return "evidence";
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
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
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
