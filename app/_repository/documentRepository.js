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
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "docId"
        });
        store.createIndex("caseId", "caseId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

export const DocumentRepository = {
  async addFiles(caseId, fileList) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const now = new Date().toISOString();

    const files = Array.from(fileList);

    for (const file of files) {
      const record = {
        docId: crypto.randomUUID(),
        caseId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: now,
        blob: file,
        extractedText: "" // NEW: store OCR text per document
      };
      store.put(record);
    }

    return tx.complete;
  },

  async listByCaseId(caseId) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("caseId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(caseId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
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
    if (!doc) return;

    doc.extractedText = text || "";
    store.put(doc);

    return tx.complete;
  },

  async delete(docId) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(docId);
    return tx.complete;
  },

  async getObjectUrl(docId) {
    const doc = await this.get(docId);
    if (!doc || !doc.blob) return null;
    return URL.createObjectURL(doc.blob);
  }
};
