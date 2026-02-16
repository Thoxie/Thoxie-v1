// Path: /app/_lib/docs/chunker.js
// Deterministic chunking for RAG v1 (text-only).
// Keep this simple & stable; we can upgrade later (token-based, sentence-aware, etc.).

export function chunkText(input, opts = {}) {
  const text = String(input || "").replace(/\r\n/g, "\n").trim();
  const maxChars = Number(opts.maxChars || 1200);
  const overlap = Number(opts.overlap || 200);

  if (!text) return [];

  const chunks = [];
  let start = 0;
  let idx = 0;

  while (start < text.length) {
    const end = Math.min(text.length, start + maxChars);
    const slice = text.slice(start, end).trim();

    if (slice) {
      chunks.push({
        index: idx,
        startChar: start,
        endChar: end,
        text: slice,
      });
      idx += 1;
    }

    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

export function makeChunkId(docId, chunkIndex) {
  return `${docId}::chunk_${chunkIndex}`;
}

