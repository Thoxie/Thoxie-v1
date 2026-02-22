// Path: /app/_repository/documentRepository.js
"use client";

const DB_NAME = "thoxie_docs";
const DB_VERSION = 1;

const STORE = "documents";

// NOTE: This repository is browser-local (IndexedDB). No server dependency.
// We keep writes transaction-safe by doing any awaited work (like text extraction)
// BEFORE opening a readwrite transaction.
export const DocumentRepository = {
  async addFiles(caseId, files, options = {}) {
    if (!caseId) throw new Error("Missing caseId");
    const list = Array.from(files || []);
    if (list.length === 0) return [];

    // IMPORTANT: compute next order BEFORE opening a readwrite transaction
    // because IndexedDB transactions auto-finish if you await between requests.
    const existing = await this.listByCaseId(caseId);
    const maxOrder = (existing || []).reduce((m, d) => Math.max(m, Number(d.order || 0)), 0);

    // Best-effort extraction (text-only). This is intentionally conservative:
    // - only for small text-like files
    // - caps stored text
    const prepared = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const extractedText = await extractTextForFile(file);
      prepared.push({ file, extractedText });
    }

    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const created = [];

    for (let i = 0; i < prepared.length; i++) {
      const { file, extractedText } = prepared[i];
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
        extractedText: extractedText || "",

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

  // ADDITIVE: used by AIChatbox Sync. Returns the stored Blob for the document.
  async getBlobById(docId) {
    const row = await this.get(docId);
    return row?.blob || null;
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

  async updateExtractedText(docId, extractedText) {
    if (!docId) return null;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const row = await promisifyRequest(store.get(docId));
    if (!row) {
      db.close();
      return null;
    }
    row.extractedText = String(extractedText || "");
    store.put(row);
    await promisifyTx(tx);
    db.close();
    return row;
  },

  async updateMetadata(docId, patch = {}) {
    if (!docId) return null;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const row = await promisifyRequest(store.get(docId));
    if (!row) {
      db.close();
      return null;
    }

    if (typeof patch.name === "string") row.name = patch.name;
    if (typeof patch.docType === "string") row.docType = normalizeDocType(patch.docType);
    if (typeof patch.exhibitDescription === "string") row.exhibitDescription = patch.exhibitDescription;

    store.put(row);
    await promisifyTx(tx);
    db.close();
    return row;
  },

  async moveUp(docId) {
    return moveByDelta(docId, -1);
  },

  async moveDown(docId) {
    return moveByDelta(docId, +1);
  },

  async getObjectUrl(docId) {
    const row = await this.get(docId);
    if (!row?.blob) return null;
    try {
      return URL.createObjectURL(row.blob);
    } catch {
      return null;
    }
  }
};

function normalizeDocType(s) {
  const v = String(s || "").trim().toLowerCase();
  if (!v) return "evidence";
  if (v === "evidence") return "evidence";
  if (v === "pleading") return "pleading";
  if (v === "correspondence") return "correspondence";
  if (v === "other") return "other";
  return "evidence";
}

async function extractTextForFile(file) {
  // Browser-side extraction is best-effort only (used for previews / UX).
  // Server-side extraction is authoritative for RAG.
  try {
    const mt = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();

    const looksText =
      mt.startsWith("text/") ||
      mt.includes("json") ||
      mt.includes("xml") ||
      mt.includes("csv") ||
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".csv") ||
      name.endsWith(".json") ||
      name.endsWith(".xml") ||
      name.endsWith(".yaml") ||
      name.endsWith(".yml");

    if (!looksText) return "";

    const MAX = 80_000; // browser-side cap (preview only)
    const text = await file.text();
    const clipped = String(text || "").slice(0, MAX);
    return clipped;
  } catch {
    return "";
  }
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
        store.createIndex("uploadedAt", "uploadedAt", { unique: false });
        store.createIndex("order", "order", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function moveByDelta(docId, delta) {
  if (!docId) return null;

  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  const row = await promisifyRequest(store.get(docId));
  if (!row) {
    db.close();
    return null;
  }

  const caseId = row.caseId;
  const all = await promisifyRequest(store.index("caseId").getAll(caseId));
  const arr = Array.isArray(all) ? all : [];
  arr.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  const idx = arr.findIndex((d) => d.docId === docId);
  const swapIdx = idx + delta;
  if (idx < 0 || swapIdx < 0 || swapIdx >= arr.length) {
    db.close();
    return row;
  }

  const a = arr[idx];
  const b = arr[swapIdx];

  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;

  store.put(a);
  store.put(b);

  await promisifyTx(tx);
  db.close();

  return row;
}
