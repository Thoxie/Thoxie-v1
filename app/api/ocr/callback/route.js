/* PATH: app/api/ocr/callback/route.js */
/* FILE: route.js */
/* ACTION: ADD (NEW FILE) */

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
import { chunkText } from "../../../_lib/rag/chunkText";
import { RAG_LIMITS } from "../../../_lib/rag/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function clip(text, maxChars) {
  const normalized = cleanText(text);
  if (!maxChars || normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars).trim();
}

function normalizeStatus(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return "completed";
  if (["completed", "success", "succeeded", "ok"].includes(s)) return "completed";
  if (["failed", "failure", "error"].includes(s)) return "failed";
  if (["processing", "running", "in_progress"].includes(s)) return "processing";
  return s;
}

function getAuthToken(req, body) {
  const headerToken = String(req.headers.get("x-thoxie-ocr-token") || "").trim();

  if (headerToken) return headerToken;

  const authHeader = String(req.headers.get("authorization") || "").trim();
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return String(body?.callbackToken || "").trim();
}

function requireCallbackAuth(req, body) {
  const expected = String(process.env.THOXIE_OCR_CALLBACK_TOKEN || "").trim();
  if (!expected) {
    throw new Error("Server OCR callback token is not configured");
  }

  const actual = getAuthToken(req, body);
  if (!actual || actual !== expected) {
    const error = new Error("Unauthorized OCR callback");
    error.status = 401;
    throw error;
  }
}

async function getDocumentRow(pool, docId) {
  const result = await pool.query(
    `
    select
      doc_id,
      case_id,
      name,
      ocr_job_id,
      ocr_status,
      ocr_provider
    from thoxie_document
    where doc_id = $1
    limit 1
    `,
    [docId]
  );

  return result.rows[0] || null;
}

async function persistChunks(poolOrClient, { caseId, docId, extractedText }) {
  const chunks = chunkText(extractedText || "");
  const cappedChunks = chunks.slice(0, 250);

  await poolOrClient.query(
    `
    delete from thoxie_document_chunk
    where doc_id = $1
    `,
    [docId]
  );

  let insertedCount = 0;

  for (let i = 0; i < cappedChunks.length; i += 1) {
    const chunk = cleanText(cappedChunks[i] || "");
    if (!chunk) continue;

    await poolOrClient.query(
      `
      insert into thoxie_document_chunk
        (chunk_id, case_id, doc_id, chunk_index, chunk_text)
      values
        ($1, $2, $3, $4, $5)
      on conflict (doc_id, chunk_index)
      do update set
        chunk_text = excluded.chunk_text
      `,
      [`${docId}:${i}`, caseId, docId, i, chunk]
    );

    insertedCount += 1;
  }

  return insertedCount;
}

export async function GET() {
  return json({
    ok: true,
    route: "/api/ocr/callback",
    runtime,
    status: "ready",
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    requireCallbackAuth(req, body);

    const docId = cleanText(body?.docId || "");
    const ocrJobId = cleanText(body?.ocrJobId || "");
    const requestedStatus = normalizeStatus(body?.status);
    const ocrProvider = cleanText(body?.ocrProvider || body?.provider || "");
    const extractionMethod = cleanText(body?.extractionMethod || "ocr") || "ocr";
    const extractedText = clip(body?.text || body?.extractedText || "", RAG_LIMITS.maxCharsPerDoc);
    const callbackError = cleanText(body?.error || body?.message || "");

    if (!docId) {
      return json({ ok: false, error: "Missing docId" }, 400);
    }

    const pool = getPool();
    await ensureSchema(pool);

    const existing = await getDocumentRow(pool, docId);
    if (!existing) {
      return json({ ok: false, error: "Document not found" }, 404);
    }

    if (ocrJobId && existing.ocr_job_id && existing.ocr_job_id !== ocrJobId) {
      return json({ ok: false, error: "OCR job mismatch" }, 409);
    }

    if (requestedStatus === "processing") {
      await pool.query(
        `
        update thoxie_document
        set
          ocr_status = 'processing_external',
          ocr_provider = case when $2 = '' then ocr_provider else $2 end,
          ocr_error = ''
        where doc_id = $1
        `,
        [docId, ocrProvider]
      );

      return json({
        ok: true,
        docId,
        ocrStatus: "processing_external",
      });
    }

    if (requestedStatus === "failed") {
      await pool.query(
        `
        update thoxie_document
        set
          ocr_status = 'failed_external',
          ocr_provider = case when $2 = '' then ocr_provider else $2 end,
          ocr_error = $3,
          ocr_completed_at = now()
        where doc_id = $1
        `,
        [docId, ocrProvider, callbackError || "External OCR failed"]
      );

      return json({
        ok: true,
        docId,
        ocrStatus: "failed_external",
      });
    }

    if (!extractedText) {
      await pool.query(
        `
        update thoxie_document
        set
          ocr_status = 'failed_external',
          ocr_provider = case when $2 = '' then ocr_provider else $2 end,
          ocr_error = 'External OCR returned no text',
          ocr_completed_at = now()
        where doc_id = $1
        `,
        [docId, ocrProvider]
      );

      return json({
        ok: false,
        error: "External OCR returned no text",
        docId,
      }, 422);
    }

    const client = await pool.connect();
    let chunkCount = 0;

    try {
      await client.query("BEGIN");

      await client.query(
        `
        update thoxie_document
        set
          extracted_text = $2,
          extraction_method = $3,
          ocr_status = 'completed',
          ocr_provider = case when $4 = '' then ocr_provider else $4 end,
          ocr_error = '',
          ocr_completed_at = now()
        where doc_id = $1
        `,
        [docId, extractedText, extractionMethod, ocrProvider]
      );

      chunkCount = await persistChunks(client, {
        caseId: existing.case_id,
        docId,
        extractedText,
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return json({
      ok: true,
      docId,
      ocrStatus: "completed",
      extractionMethod,
      storedTextLength: extractedText.length,
      chunkCount,
      readableByAI: extractedText.length > 0 && chunkCount > 0,
    });
  } catch (err) {
    const status = Number(err?.status || 500) || 500;
    return json(
      {
        ok: false,
        error: String(err?.message || err),
      },
      status
    );
  }
}
