// Path: /app/_lib/docs/docStore.js
// Server-side doc storage adapter (dev-friendly).
// NOTE: This is an in-memory store persisted across hot reload via globalThis.
// In Vercel/serverless, this will not persist across invocations — we will swap to DB/KV later.

function getState() {
  if (!globalThis.__THOXIE_DOC_STORE__) {
    globalThis.__THOXIE_DOC_STORE__ = {
      docsById: new Map(),     // docId -> doc
      docsByCase: new Map(),   // caseId -> Set(docId)
    };
  }
  return globalThis.__THOXIE_DOC_STORE__;
}

export function createDocId() {
  // Deterministic enough for dev; replace with UUID later.
  return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function putDoc(doc) {
  const s = getState();
  s.docsById.set(doc.id, doc);

  const caseId = String(doc.caseId || "").trim() || "unknown";
  if (!s.docsByCase.has(caseId)) s.docsByCase.set(caseId, new Set());
  s.docsByCase.get(caseId).add(doc.id);

  return doc;
}

export function getDoc(docId) {
  const s = getState();
  return s.docsById.get(docId) || null;
}

export function listDocsByCase(caseId) {
  const s = getState();
  const key = String(caseId || "").trim() || "unknown";
  const set = s.docsByCase.get(key);
  if (!set) return [];
  const out = [];
  for (const id of set.values()) {
    const d = s.docsById.get(id);
    if (d) out.push(d);
  }
  // newest first
  out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return out;
}

