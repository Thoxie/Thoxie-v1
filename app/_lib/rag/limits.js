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

  // Raised from ~2MB because screenshots, phone photos, and larger PDFs
  // were being accepted by upload but failing extraction.
  maxBase64BytesPerDoc: 8_000_000
};
