/* 1. PATH: app/_lib/rag/limits.js */
/* 1. FILE: limits.js */
/* 1. ACTION: OVERWRITE */

export const RAG_LIMITS = {
  // Max documents per ingest call
  maxDocsPerIngest: 12,

  // Max characters indexed per document (after extraction)
  maxCharsPerDoc: 180_000,

  // Chunk sizes for indexing
  chunkSize: 900,
  chunkOverlap: 150,

  // Max chunks returned per query
  maxHits: 6,

  // Hard cap for base64 payload per doc (client->server)
  // Raised because common photos/screenshots often exceed ~2MB.
  maxBase64BytesPerDoc: 8_000_000 // ~8.0MB
};
