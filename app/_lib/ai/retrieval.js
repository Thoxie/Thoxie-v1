// Path: /app/_lib/ai/retrieval.js

/**
 * retrieveRelevantChunks()
 *
 * v1 (now): stub that returns no citations.
 * Next: wire to your Documents store + chunk index (RAG), returning citations with:
 * { source, caseId, docId, page, excerpt }
 */
export async function retrieveRelevantChunks({ query, caseId, caseRecord, topK = 5 } = {}) {
  const q = String(query || "").trim();

  // Keep stable return shape.
  if (!q) {
    return {
      citations: [],
      meta: { topK: Number(topK) || 5, reason: "empty_query" },
    };
  }

  // TODO (next): implement embeddings + vector search.
  // For now, no-op.
  return {
    citations: [],
    meta: {
      topK: Number(topK) || 5,
      reason: "retrieval_stub_not_implemented",
      caseId: String(caseId || "").trim(),
      hasCaseRecord: !!caseRecord,
    },
  };
}

