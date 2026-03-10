// Path: /app/_lib/rag/chunkText.js

import { RAG_LIMITS } from "./limits";

function logChunkDiagnostic(payload = {}) {
  console.info(
    "UPLOAD_DIAGNOSTIC",
    JSON.stringify({
      scope: "chunkText",
      ...payload,
    })
  );
}

export function chunkText(text, opts = {}) {
  const chunkSize = opts.chunkSize ?? RAG_LIMITS.chunkSize;
  const overlap = opts.chunkOverlap ?? RAG_LIMITS.chunkOverlap;

  const t = String(text || "").replace(/\r\n/g, "\n");
  if (!t.trim()) {
    logChunkDiagnostic({
      event: "chunk_skipped_empty_text",
      chunk_size: chunkSize,
      overlap,
      input_length: 0,
      chunks_created: 0,
    });
    return [];
  }

  const chunks = [];
  let i = 0;

  while (i < t.length) {
    const end = Math.min(i + chunkSize, t.length);
    const slice = t.slice(i, end).trim();
    if (slice) chunks.push(slice);

    if (end >= t.length) break;
    i = Math.max(0, end - overlap);
  }

  logChunkDiagnostic({
    event: "chunk_completed",
    chunk_size: chunkSize,
    overlap,
    input_length: t.length,
    chunks_created: chunks.length,
  });

  return chunks;
}
