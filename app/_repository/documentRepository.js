// Path: /app/_repository/documentRepository.js

const DB_NAME = "thoxie-documents-db";
const STORE_NAME = "documents";
const DB_VERSION = 2;

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: "docId" });
      } else {
        store = request.transaction.objectStore(STORE_NAME);
      }

      // Always ensure caseId index exists
      if (!store.indexNames.contains("caseId")) {
        store.createIndex("caseId", "caseId", { unique: false });
      }

      // Upgrade existing rows: add `order` if missing (best-effort)
      // Note: cursor updates are allowed during upgrade transaction.
      try {
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;

          const v = cursor.value || {};
          if (typeof v.order !== "number") {
            const ts = v.uploadedAt ? Date.parse(v.uploadedAt) : Date.now();
            v.order = Number.isFinite(ts) ? ts : Date.now();
            cursor.update(v);
          }
          cursor.continue();
        };
      } catch (_e) {
        // If anything fails here, we still keep schema; ordering falls back at runtime.
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

function normalizeDocType(t) {
  const s = String(t || "").trim();
  return s ? s : "Evidence";
}

export const DocumentRepository = {
  /**
   * addFiles(caseId, FileList, options?)
   * options: { documentType?: string }
   */
  async addFiles(caseId, fileList, options = {}) {
    if (!caseId) throw new Error("caseId is required");
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const nowIso = new Date().toISOString();
    const baseOrder = Date.now();
    const files = Array.from(fileList || []);
    const documentType = normalizeDocType(options.documentType);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const record = {
        docId: crypto.randomUUID(),
        caseId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: nowIso,

        // Raw file
        blob: file,

        // Metadata we’ll use throughout v1
        documentType,
        exhibitDescription: "",
        extractedText: "",

        // Ordering within a case (supports Move Up/Down)
        order: baseOrder + i
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

    // Stable ordering: order asc, else uploadedAt asc, else name
    return (rows || []).sort((a, b) => {
      const ao = typeof a?.order === "number" ? a.order : Number.POSITIVE_INFINITY;
      const bo = typeof b?.order === "number" ? b.order : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;

      const at = a?.uploadedAt ? Date.parse(a.uploadedAt) : 0;
      const bt = b?.uploadedAt ? Date.parse(b.uploadedAt) : 0;
      if (at !== bt) return at - bt;

      return String(a?.name || "").localeCompare(String(b?.name || ""));
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

  /**
   * updateMetadata(docId, patch)
   * patch can include: exhibitDescription, documentType, order, name, etc.
   */
  async updateMetadata(docId, patch = {}) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const doc = await this.get(docId);
    if (!doc) return false;

    const next = { ...doc, ...(patch || {}) };

    if ("documentType" in patch) {
      next.documentType = normalizeDocType(patch.documentType);
    }

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

  /**
   * Move Up/Down by swapping `order` with the adjacent doc in the case ordering.
   * These are "safe" operations: they only affect `order`.
   */
  async moveUp(caseId, docId) {
    if (!caseId || !docId) return false;
    const rows = await this.listByCaseId(caseId);
    const idx = rows.findIndex((r) => r.docId === docId);
    if (idx <= 0) return false;

    const a = rows[idx - 1];
    const b = rows[idx];

    const ao = typeof a.order === "number" ? a.order : Date.now() - 1;
    const bo = typeof b.order === "number" ? b.order : Date.now();

    await this.updateMetadata(a.docId, { order: bo });
    await this.updateMetadata(b.docId, { order: ao });
    return true;
  },

  async moveDown(caseId, docId) {
    if (!caseId || !docId) return false;
    const rows = await this.listByCaseId(caseId);
    const idx = rows.findIndex((r) => r.docId === docId);
    if (idx < 0 || idx >= rows.length - 1) return false;

    const a = rows[idx];
    const b = rows[idx + 1];

    const ao = typeof a.order === "number" ? a.order : Date.now();
    const bo = typeof b.order === "number" ? b.order : Date.now() + 1;

    await this.updateMetadata(a.docId, { order: bo });
    await this.updateMetadata(b.docId, { order: ao });
    return true;
  }
};
