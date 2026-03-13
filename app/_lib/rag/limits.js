/* PATH: app/_lib/rag/limits.js */
/* FILE: limits.js */
/* ACTION: FULL OVERWRITE */

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

  // Legacy JSON/base64 upload ceiling. This stays lower because base64 inflates payload size.
  maxBase64BytesPerDoc: 8_000_000,

  // Raw binary ceiling for multipart uploads. This is the practical upload target for larger PDFs.
  maxUploadBytesPerDoc: 20_000_000,
};
