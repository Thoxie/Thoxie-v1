// Path: /app/api/rag/ingest/route.js

import { NextResponse } from "next/server";
import { RAG_LIMITS } from "../../../_lib/rag/limits";
import { extractTextFromPayload } from "../../../_lib/rag/extractText";
import { chunkText } from "../../../_lib/rag/chunkText";
import { upsertDocumentChunks, listCaseDocs } from "../../../_lib/rag/memoryIndex";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
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
      const up = upsertDocumentChunks({ caseId, docId, name, mimeType, chunks });

      results.push({
        docId: up.docId,
        name,
        ok: true,
        method: ex.method,
        chunksCount: up.chunksCount
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

