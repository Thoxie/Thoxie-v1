// PATH: /app/api/ocr/callback/route.js
// DIRECTORY: /app/api/ocr/callback
// FILE: route.js
// ACTION: OVERWRITE ENTIRE FILE

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
import {
  cleanStoredText as cleanText,
  clipStoredText,
  persistDocumentChunks,
  upsertDocumentRow,
} from "@/app/_lib/documents/documentPersistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function logOcrDiagnostic(payload = {}) {
  console.info(
    "UPLOAD_DIAGNOSTIC",
    JSON.stringify({
      scope: "ocrCallback",
      ...payload,
    })
  );
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
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
      mime_type,
      size_bytes,
      doc_type,
      blob_url,
      ocr_job_id,
      ocr_status,
      ocr_provider,
      ocr_requested_at,
      ocr_completed_at,
      ocr_error
    from thoxie_document
    where doc_id = $1
    limit 1
    `,
    [docId]
  );

  return result.rows[0] || null;
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
    const extractedText = clipStoredText(body?.text || body?.extractedText || "");
    const callbackError = cleanText(body?.error || body?.message || "");

    logOcrDiagnostic({
      event: "callback_received",
      doc_id: docId,
      ocr_job_id: ocrJobId,
      requested_status: requestedStatus,
      extraction_method: extractionMethod,
      stored_text_length: extractedText.length,
      extracted_text_written: extractedText.length > 0,
    });

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
          ocr_job_id = case when $3 = '' then ocr_job_id else $3 end,
          ocr_error = ''
        where doc_id = $1
        `,
        [docId, ocrProvider, ocrJobId]
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
          ocr_job_id = case when $3 = '' then ocr_job_id else $3 end,
          ocr_error = $4,
          ocr_completed_at = now()
        where doc_id = $1
        `,
        [docId, ocrProvider, ocrJobId, callbackError || "External OCR failed"]
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
          ocr_job_id = case when $3 = '' then ocr_job_id else $3 end,
          ocr_error = 'External OCR returned no text',
          ocr_completed_at = now()
        where doc_id = $1
        `,
        [docId, ocrProvider, ocrJobId]
      );

      return json(
        {
          ok: false,
          error: "External OCR returned no text",
          docId,
        },
        422
      );
    }

    const client = await pool.connect();
    let chunkCount = 0;

    try {
      await client.query("BEGIN");

      await upsertDocumentRow(client, {
        docId,
        caseId: existing.case_id,
        name: existing.name || "",
        mimeType: existing.mime_type || "",
        sizeBytes: Number(existing.size_bytes || 0),
        docType: existing.doc_type || "evidence",
        blobUrl: existing.blob_url || "",
        extractedText,
        extractionMethod,
        ocrStatus: "completed",
        ocrJobId: cleanText(ocrJobId || existing.ocr_job_id || ""),
        ocrProvider: cleanText(ocrProvider || existing.ocr_provider || ""),
        ocrRequestedAt: existing.ocr_requested_at || null,
        ocrCompletedAt: new Date().toISOString(),
        ocrError: "",
      });

      chunkCount = await persistDocumentChunks(client, {
        caseId: existing.case_id,
        docId,
        extractedText,
        name: existing.name || "",
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    logOcrDiagnostic({
      event: "callback_completed",
      doc_id: docId,
      ocr_status: "completed",
      extraction_method: extractionMethod,
      stored_text_length: extractedText.length,
      extracted_text_written: extractedText.length > 0,
      chunks_created: chunkCount,
    });

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
    logOcrDiagnostic({
      event: "callback_failed",
      status,
      error: String(err?.message || err),
    });
    return json(
      {
        ok: false,
        error: String(err?.message || err),
      },
      status
    );
  }
}
