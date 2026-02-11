// Path: /app/_repository/documentRepository.js

const DB_NAME = "thoxie-documents-db";
const STORE_NAME = "documents";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "docId" });
        store.createIndex("caseId", "caseId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

function safeNumber(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export const DocumentRepository = {
  async addFiles(caseId, fileList) {
    const files = Array.from(fileList || []);
    if (!caseId || files.length === 0) return true;

    // Determine next order index for this case (stable ordering)
    const existing = await this.listByCaseId(caseId);
    const maxOrder = existing.reduce((m, d) => Math.max(m, safeNumber(d.order, -1)), -1);
    let nextOrder = maxOrder + 1;

    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const now = new Date().toISOString();

    for (const file of files) {
      const record = {
        docId: crypto.randomUUID(),
        caseId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: now,
        blob: file,

        // existing feature
        extractedText: "",

        // new metadata
        order: nextOrder++,
        exhibitDescription: "" // short user-entered description
      };

      store.put(record);
    }

    await txDone(tx);
    return true;
  },

  async listByCaseId(caseId) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("caseId");

    const rows = await new Promise((resolve, reject) => {
      const request = index.getAll(caseId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // Stable sort: order asc, then uploadedAt asc, then name
    return (rows || []).slice().sort((a, b) => {
      const ao = safeNumber(a.order, 1e15);
      const bo = safeNumber(b.order, 1e15);
      if (ao !== bo) return ao - bo;

      const at = String(a.uploadedAt || "");
      const bt = String(b.uploadedAt || "");
      if (at !== bt) return at.localeCompare(bt);

      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  },

  async get(docId) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(docId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async updateExtractedText(docId, text) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const doc = await this.get(docId);
    if (!doc) return false;

    doc.extractedText = text || "";
    store.put(doc);

    await txDone(tx);
    return true;
  },

  // NEW: generic metadata update (used for exhibitDescription, future fields, etc.)
  async updateMetadata(docId, patch) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const doc = await this.get(docId);
    if (!doc) return false;

    const next = { ...doc, ...(patch || {}) };
    store.put(next);

    await txDone(tx);
    return true;
  },

  async delete(docId) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.delete(docId);

    await txDone(tx);
    return true;
  },

  async getObjectUrl(docId) {
    const doc = await this.get(docId);
    if (!doc || !doc.blob) return null;
    return URL.createObjectURL(doc.blob);
  },

  // NEW: reorder helpers (swap order with neighbor)
  async moveUp(caseId, docId) {
    const docs = await this.listByCaseId(caseId);
    const idx = docs.findIndex((d) => d.docId === docId);
    if (idx <= 0) return false;

    const a = docs[idx - 1];
    const b = docs[idx];

    const aOrder = safeNumber(a.order, idx - 1);
    const bOrder = safeNumber(b.order, idx);

    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({ ...a, order: bOrder });
    store.put({ ...b, order: aOrder });

    await txDone(tx);
    return true;
  },

  async moveDown(caseId, docId) {
    const docs = await this.listByCaseId(caseId);
    const idx = docs.findIndex((d) => d.docId === docId);
    if (idx === -1 || idx >= docs.length - 1) return false;

    const a = docs[idx];
    const b = docs[idx + 1];

    const aOrder = safeNumber(a.order, idx);
    const bOrder = safeNumber(b.order, idx + 1);

    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({ ...a, order: bOrder });
    store.put({ ...b, order: aOrder });

    await txDone(tx);
    return true;
  }
};
