// Path: /app/api/rag/ingest/route.js

import { NextResponse } from "next/server";
import { RAG_LIMITS } from "../../../_lib/rag/limits";
import { extractTextFromPayload } from "../../../_lib/rag/extractText";
import { chunkText } from "../../../_lib/rag/chunkText";
import { upsertDocumentChunks, listCaseDocs } from "../../../_lib/rag/memoryIndex";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function approxBase64Bytes(b64) {
  const s = String(b64 || "");
  if (!s) return 0;
  const len = s.length;
  const padding = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ ok: false, error: "Invalid JSON" }, 400);

    const caseId = String(body.caseId || "").trim() || "no-case";
    const docs = Array.isArray(body.documents) ? body.documents : [];

    if (docs.length === 0) return json({ ok: false, error: "No documents provided" }, 400);
    if (docs.length > RAG_LIMITS.maxDocsPerIngest) {
      return json({ ok: false, error: `Too many documents (max ${RAG_LIMITS.maxDocsPerIngest})` }, 400);
    }

    // Guardrail: cap total base64 payload (prevents 413 and runaway memory)
    const MAX_TOTAL_BASE64_BYTES = 3_000_000; // ~3MB across all docs
    let totalBase64Bytes = 0;
    for (const d of docs) {
      if (typeof d?.base64 === "string" && d.base64.trim()) {
        totalBase64Bytes += approxBase64Bytes(d.base64);
      }
    }
    if (totalBase64Bytes > MAX_TOTAL_BASE64_BYTES) {
      return json(
        { ok: false, error: `Request too large for Phase-1 sync (max ${MAX_TOTAL_BASE64_BYTES} bytes total).` },
        413
      );
    }

    const results = [];
    for (const d of docs) {
      const docId = String(d.docId || d.id || "").trim();
      const name = String(d.name || d.filename || "").trim() || "(unnamed)";
      const mimeType = String(d.mimeType || d.kind || "").trim();

      const ex = extractTextFromPayload({
        mimeType,
        text: d.text,
        base64: d.base64
      });

      if (!ex.ok || !ex.text.trim()) {
        results.push({
          docId: docId || null,
          name,
          ok: false,
          method: ex.method,
          chunksCount: 0,
          note: "No indexable text available in Phase-1 for this file type."
        });
        continue;
      }

      const chunks = chunkText(ex.text);

      // Guardrail: cap chunks per doc (prevents runaway memory usage)
      const MAX_CHUNKS_PER_DOC = 240;
      const cappedChunks = chunks.slice(0, MAX_CHUNKS_PER_DOC);

      const up = upsertDocumentChunks({ caseId, docId, name, mimeType, chunks: cappedChunks });

      results.push({
        docId: up.docId,
        name,
        ok: true,
        method: ex.method,
        chunksCount: up.chunksCount,
        note: chunks.length > cappedChunks.length ? `Chunk cap applied (${MAX_CHUNKS_PER_DOC}).` : undefined
      });
    }

    return json({
      ok: true,
      caseId,
      indexed: results,
      caseDocs: listCaseDocs(caseId)
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}

