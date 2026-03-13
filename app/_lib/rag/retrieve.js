/* PATH: app/_lib/rag/retrieve.js */
/* FILE: retrieve.js */
/* ACTION: FULL OVERWRITE */

import { RAG_LIMITS } from "./limits";
import { getCaseDocChunks } from "./memoryIndex";

function tokenize(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 16);
}

function scoreChunk(chunk, terms) {
  const text = String(chunk || "").toLowerCase();
  let score = 0;
  for (const t of terms) {
    const hits = text.split(t).length - 1;
    if (hits > 0) score += Math.min(8, hits) * 3;
  }
  score += Math.max(0, 6 - Math.floor(text.length / 400));
  return score;
}

function scoreDocumentNameMatch(docName, query) {
  const nameTerms = tokenize(String(docName || ""));
  const queryTerms = new Set(tokenize(query));
  let score = 0;

  for (const term of nameTerms) {
    if (queryTerms.has(term)) score += 5;
  }

  const lowerName = String(docName || "").toLowerCase();
  const lowerQuery = String(query || "").toLowerCase();
  if (lowerName && lowerQuery.includes(lowerName)) score += 20;

  return score;
}

function buildChunkWindow(chunks, index) {
  const parts = [];

  for (let offset = -1; offset <= 1; offset += 1) {
    const value = String(chunks[index + offset] || "").trim();
    if (value) parts.push(value);
  }

  return parts.join("\n").trim();
}

export function retrieveSnippets({ caseId, query, maxHits }) {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const docs = getCaseDocChunks(caseId);
  const hits = [];

  for (const d of docs) {
    const chunks = Array.isArray(d.chunks) ? d.chunks : [];
    const nameBoost = scoreDocumentNameMatch(d?.name, query);

    for (let i = 0; i < chunks.length; i++) {
      const ch = String(chunks[i] || "").trim();
      if (!ch) continue;

      let sc = scoreChunk(ch, terms) + nameBoost;
      if (i === 0) sc += 2;
      if (sc <= 0) continue;

      hits.push({
        score: sc,
        docId: d.docId,
        docName: d.name,
        chunkIndex: i,
        text: buildChunkWindow(chunks, i),
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
  lines.push("RETRIEVED_DOCUMENT_EVIDENCE:");
  lines.push("");

  hits.forEach((h, idx) => {
    lines.push(`[#${idx + 1}] ${h.docName} (docId: ${h.docId}) — chunk ${h.chunkIndex + 1}`);
    lines.push(h.text.length > 1200 ? `${h.text.slice(0, 1200)}…` : h.text);
    lines.push("");
  });

  return lines.join("\n").trim();
}

