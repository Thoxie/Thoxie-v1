// Path: /app/_repository/documentRepository.js

const DB_NAME = "thoxie.documents.v1";
const STORE_NAME = "documents";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "docId" });
        store.createIndex("caseId", "caseId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId() {
  return crypto.randomUUID();
}

export const DocumentRepository = {
  async addFiles(caseId, fileList) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const existing = await this.listByCaseId(caseId);
    const baseOrder = existing.length;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      store.put({
        docId: generateId(),
        caseId,
        name: file.name,
        blob: file,
        extractedText: "",
        order: baseOrder + i,
        createdAt: new Date().toISOString()
      });
    }

    return tx.complete;
  },

  async listByCaseId(caseId) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("caseId");

    return new Promise((resolve) => {
      const request = index.getAll(caseId);
      request.onsuccess = () => {
        const docs = request.result || [];
        docs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        resolve(docs);
      };
    });
  },

  async get(docId) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const request = store.get(docId);
      request.onsuccess = () => resolve(request.result);
    });
  },

  async updateExtractedText(docId, text) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const doc = await this.get(docId);
    if (!doc) return;

    doc.extractedText = text;
    store.put(doc);
  },

  async moveUp(docId) {
    const doc = await this.get(docId);
    if (!doc) return;

    const docs = await this.listByCaseId(doc.caseId);
    const index = docs.findIndex((d) => d.docId === docId);
    if (index <= 0) return;

    const prev = docs[index - 1];

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const temp = doc.order;
    doc.order = prev.order;
    prev.order = temp;

    store.put(doc);
    store.put(prev);
  },

  async moveDown(docId) {
    const doc = await this.get(docId);
    if (!doc) return;

    const docs = await this.listByCaseId(doc.caseId);
    const index = docs.findIndex((d) => d.docId === docId);
    if (index === -1 || index >= docs.length - 1) return;

    const next = docs[index + 1];

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const temp = doc.order;
    doc.order = next.order;
    next.order = temp;

    store.put(doc);
    store.put(next);
  },

  async delete(docId) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(docId);
  }
};
