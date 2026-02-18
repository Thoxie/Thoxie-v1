// Path: /app/_lib/rag/chunkText.js

import { RAG_LIMITS } from "./limits";

export function chunkText(text, opts = {}) {
  const chunkSize = opts.chunkSize ?? RAG_LIMITS.chunkSize;
  const overlap = opts.chunkOverlap ?? RAG_LIMITS.chunkOverlap;

  const t = String(text || "").replace(/\r\n/g, "\n");
  if (!t.trim()) return [];

  const chunks = [];
  let i = 0;

  while (i < t.length) {
    const end = Math.min(i + chunkSize, t.length);
    const slice = t.slice(i, end).trim();
    if (slice) chunks.push(slice);

    if (end >= t.length) break;
    i = Math.max(0, end - overlap);
  }

  return chunks;
}

