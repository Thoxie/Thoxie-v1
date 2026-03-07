/* FILE: app/api/ingest/route.js */
/* ACTION: FULL OVERWRITE EXISTING FILE */

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getPool } from "@/app/_lib/server/db";
import { extractTextFromPayload } from "../../_lib/rag/extractText";
import { chunkText } from "../../_lib/rag/chunkText";
import { upsertDocumentChunks } from "../../_lib/rag/memoryIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function normalizeBase64(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  const idx = s.indexOf("base64,");
  if (idx >= 0) return s.slice(idx + "base64,".length);
  return s;
}

function safeUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function GET() {
  return json({
    ok: true,
    route: "/api/ingest",
    status: "ready"
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const caseId = String(body?.caseId || "").trim();
    const documents = Array.isArray(body?.documents) ? body.documents : [];

    if (!caseId) {
      return json({ ok: false, error: "Missing caseId" }, 400);
    }

    if (!documents.length) {
      return json({ ok: false, error: "No documents provided" }, 400);
    }

    const pool = getPool();

    await pool.query(
      `
      insert into thoxie_case (case_id)
      values ($1)
      on conflict (case_id) do nothing
      `,
      [caseId]
    );

    const results = [];

    for (const doc of documents) {
      const docId = safeUuid();
      const name = String(doc?.name || "").trim() || "(unnamed)";
      const mimeType = String(doc?.mimeType || "").trim() || "application/octet-stream";
      const sizeBytes = Number(doc?.size || 0);
      const docType = String(doc?.docType || "").trim() || "evidence";
      const base64 = normalizeBase64(doc?.base64 || "");

      let blobUrl = null;

      if (base64) {
        const buf = Buffer.from(base64, "base64");

        const blob = await put(`cases/${caseId}/docs/${docId}`, buf, {
          access: "private",
          contentType: mimeType,
          token: process.env.BLOB_READ_WRITE_TOKEN
        });

        blobUrl = blob.url;
      }

      const extracted = await extractTextFromPayload({
        mimeType,
        name,
        base64
      });

      const extractedText = extracted?.ok ? String(extracted.text || "") : "";

      await pool.query(
        `
        insert into thoxie_document
          (doc_id, case_id, name, mime_type, size_bytes, doc_type, blob_url, extracted_text)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (doc_id) do update set
          case_id = excluded.case_id,
          name = excluded.name,
          mime_type = excluded.mime_type,
          size_bytes = excluded.size_bytes,
          doc_type = excluded.doc_type,
          blob_url = excluded.blob_url,
          extracted_text = excluded.extracted_text
        `,
        [
          docId,
          caseId,
          name,
          mimeType,
          sizeBytes,
          docType,
          blobUrl,
          extractedText
        ]
      );

      if (extractedText) {
        const chunks = chunkText(extractedText);

        upsertDocumentChunks({
          caseId,
          docId,
          name,
          mimeType,
          chunks
        });
      }

      results.push({
        ok: true,
        docId,
        name,
        blobUrl
      });
    }

    return json({
      ok: true,
      caseId,
      indexed: results
    });
  } catch (err) {
    return json(
      {
        ok: false,
        error: String(err?.message || err)
      },
      500
    );
  }
}
