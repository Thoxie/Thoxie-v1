// Path: /app/_lib/rag/memoryIndex.js

/**
 * In-memory index (Phase-1)
 * Works on warm serverless instances; not durable across cold starts.
 * This is the correct scaffold to prove RAG before adding DB + object storage.
 */

import { sha256Hex } from "./hash";

const GLOBAL_KEY = "__THOXIE_RAG_INDEX_V1__";

function getGlobal() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      // caseId -> { docs: Map(docKey -> docRecord), updatedAt }
      cases: new Map()
    };
  }
  return globalThis[GLOBAL_KEY];
}

export function upsertDocumentChunks({ caseId, docId, name, mimeType, chunks }) {
  const g = getGlobal();
  const cId = String(caseId || "").trim() || "no-case";
  const dId = String(docId || "").trim() || sha256Hex(name || "");

  if (!g.cases.has(cId)) {
    g.cases.set(cId, { docs: new Map(), updatedAt: Date.now() });
  }

  const bucket = g.cases.get(cId);
  const docKey = dId;

  bucket.docs.set(docKey, {
    docId: dId,
    name: String(name || "").trim() || "(unnamed)",
    mimeType: String(mimeType || "").trim() || "",
    chunks: Array.isArray(chunks) ? chunks : [],
    updatedAt: Date.now()
  });

  bucket.updatedAt = Date.now();

  return { caseId: cId, docId: dId, chunksCount: Array.isArray(chunks) ? chunks.length : 0 };
}

export function listCaseDocs(caseId) {
  const g = getGlobal();
  const cId = String(caseId || "").trim() || "no-case";
  const bucket = g.cases.get(cId);
  if (!bucket) return [];
  return Array.from(bucket.docs.values()).map((d) => ({
    docId: d.docId,
    name: d.name,
    mimeType: d.mimeType,
    chunksCount: d.chunks.length,
    updatedAt: d.updatedAt
  }));
}

export function getCaseDocChunks(caseId) {
  const g = getGlobal();
  const cId = String(caseId || "").trim() || "no-case";
  const bucket = g.cases.get(cId);
  if (!bucket) return [];
  return Array.from(bucket.docs.values());
}

