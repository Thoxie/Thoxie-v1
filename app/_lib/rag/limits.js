// Path: /app/_lib/rag/limits.js

export const RAG_LIMITS = {
  // Max documents per ingest call
  maxDocsPerIngest: 12,

  // Max characters indexed per document (after extraction)
  maxCharsPerDoc: 120_000,

  // Chunk sizes for indexing
  chunkSize: 900,
  chunkOverlap: 150,

  // Max chunks returned per query
  maxHits: 6,

  // Hard cap for base64 payload per doc (client->server) to avoid huge requests
  maxBase64BytesPerDoc: 1_500_000 // ~1.5MB
};

