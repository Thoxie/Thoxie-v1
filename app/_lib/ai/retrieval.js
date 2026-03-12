// path: /app/_lib/ai/retrieval.js

export function tokenize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreChunk(chunkText, query) {
  const queryTokens = tokenize(query);
  const chunkTokens = tokenize(chunkText);

  let score = 0;

  for (const token of queryTokens) {
    if (chunkTokens.includes(token)) {
      score += 1;
    }
  }

  return score;
}

export function rankChunks(chunks, query) {
  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      _score: scoreChunk(chunk.chunk_text || "", query),
    }))
    .sort((a, b) => b._score - a._score);

  return ranked;
}

export function selectTopChunks(chunks, query, limit = 8) {
  const ranked = rankChunks(chunks, query);
  return ranked.slice(0, limit);
}
