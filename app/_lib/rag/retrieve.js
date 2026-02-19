// Path: /app/_lib/rag/retrieve.js

import { RAG_LIMITS } from "./limits";
import { getCaseDocChunks } from "./memoryIndex";

function tokenize(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 12);
}

function scoreChunk(chunk, terms) {
  const text = chunk.toLowerCase();
  let score = 0;
  for (const t of terms) {
    // naive term frequency scoring
    const hits = text.split(t).length - 1;
    if (hits > 0) score += Math.min(8, hits) * 3;
  }
  // slight boost for shorter chunks (more focused)
  score += Math.max(0, 6 - Math.floor(chunk.length / 400));
  return score;
}

export function retrieveSnippets({ caseId, query, maxHits }) {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const docs = getCaseDocChunks(caseId);
  const hits = [];

  for (const d of docs) {
    const chunks = Array.isArray(d.chunks) ? d.chunks : [];
    for (let i = 0; i < chunks.length; i++) {
      const ch = String(chunks[i] || "");
      if (!ch) continue;
      const sc = scoreChunk(ch, terms);
      if (sc <= 0) continue;
      hits.push({
        score: sc,
        docId: d.docId,
        docName: d.name,
        chunkIndex: i,
        text: ch
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);

  const limit = Math.max(1, Math.min(maxHits || RAG_LIMITS.maxHits, 12));
  return hits.slice(0, limit);
}

export function formatSnippetsForChat(hits) {
  if (!hits || hits.length === 0) return "";

  const lines = [];
  lines.push("RETRIEVED_EVIDENCE_SNIPPETS (Phase-1 keyword retrieval):");
  lines.push("");

  hits.forEach((h, idx) => {
    lines.push(`[#${idx + 1}] ${h.docName} (docId: ${h.docId}) — chunk ${h.chunkIndex + 1}`);
    lines.push(h.text.length > 900 ? h.text.slice(0, 900) + "…" : h.text);
    lines.push("");
  });

  return lines.join("\n").trim();
}

