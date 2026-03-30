// PATH: /app/_lib/rag/limits.js
// DIRECTORY: /app/_lib/rag
// FILE: limits.js
// ACTION: OVERWRITE ENTIRE FILE

export const RAG_LIMITS = {
  // Max documents per ingest call
  maxDocsPerIngest: 12,

  // Max characters indexed per document (after extraction)
  maxCharsPerDoc: 180_000,

  // DOCX files are stored in SQL using the full extracted text.
  // 0 means "do not clip at the storage layer".
  maxStoredCharsPerDoc: 0,

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
