/* PATH: app/api/ocr/retry/route.js */
/* FILE: route.js */
/* ACTION: ADD (NEW FILE) */

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
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

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getRequestOrigin(req) {
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

function safeUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `ocr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getExternalOcrConfig(req) {
  const serviceUrl = trimTrailingSlash(process.env.THOXIE_OCR_SERVICE_URL || "");
  const callbackToken = String(process.env.THOXIE_OCR_CALLBACK_TOKEN || "").trim();
  const serviceToken = String(process.env.THOXIE_OCR_SERVICE_TOKEN || "").trim();
  const provider = String(process.env.THOXIE_OCR_PROVIDER || "external_ocr").trim() || "external_ocr";

  const explicitAppUrl = trimTrailingSlash(
    process.env.THOXIE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  );
  const requestOrigin = trimTrailingSlash(getRequestOrigin(req));
  const appBaseUrl = explicitAppUrl || requestOrigin;

  const callbackUrl = appBaseUrl ? `${appBaseUrl}/api/ocr/callback` : "";
  const enabled = !!(serviceUrl && callbackUrl && callbackToken);

  return {
    enabled,
    serviceUrl,
    serviceToken,
    callbackToken,
    callbackUrl,
    provider,
  };
}

async function dispatchExternalOcrJob(config, payload) {
  if (!config?.enabled) {
    throw new Error("External OCR is not configured");
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (config.serviceToken) {
    headers.Authorization = `Bearer ${config.serviceToken}`;
  }

  const res = await fetch(config.serviceUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const responseText = await res.text().catch(() => "");
  let responseJson = null;

  try {
    responseJson = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseJson = null;
  }

  if (!res.ok) {
    throw new Error(
      responseJson?.error ||
        responseJson?.message ||
        responseText ||
        `External OCR dispatch failed (${res.status})`
    );
  }

  return {
    ok: true,
    response: responseJson,
  };
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
      blob_url,
      extracted_text,
      extraction_method,
      ocr_status,
      ocr_job_id,
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

function isRetryEligible(status) {
  const s = String(status || "").trim();

  return (
    s === "needed_scanned_pdf" ||
    s === "failed_external" ||
    s === "failed_timeout" ||
    s === "failed_parse" ||
    s === "failed_parser"
  );
}

export async function GET() {
  return json({
    ok: true,
    route: "/api/ocr/retry",
    runtime,
    status: "ready",
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const docId = cleanText(body?.docId || "");

    if (!docId) {
      return json({ ok: false, error: "Missing docId" }, 400);
    }

    const config = getExternalOcrConfig(req);
    if (!config.enabled) {
      return json(
        {
          ok: false,
          error:
            "External OCR is not configured. Set THOXIE_OCR_SERVICE_URL, THOXIE_OCR_CALLBACK_TOKEN, and THOXIE_APP_URL or NEXT_PUBLIC_APP_URL.",
        },
        400
      );
    }

    const pool = getPool();
    await ensureSchema(pool);

    const existing = await getDocumentRow(pool, docId);
    if (!existing) {
      return json({ ok: false, error: "Document not found" }, 404);
    }

    if (!String(existing.mime_type || "").toLowerCase().includes("pdf")) {
      return json({ ok: false, error: "Only PDF documents can be retried for scanned-PDF OCR" }, 400);
    }

    if (!existing.blob_url) {
      return json({ ok: false, error: "Document does not have a stored blob URL" }, 400);
    }

    if (!isRetryEligible(existing.ocr_status)) {
      return json(
        {
          ok: false,
          error: `Document OCR status is not retry-eligible: ${existing.ocr_status || "unknown"}`,
        },
        409
      );
    }

    const ocrJobId = safeUuid();
    const requestedAt = new Date().toISOString();

    await pool.query(
      `
      update thoxie_document
      set
        ocr_status = 'queued_external',
        ocr_job_id = $2,
        ocr_provider = $3,
        ocr_requested_at = $4,
        ocr_completed_at = null,
        ocr_error = ''
      where doc_id = $1
      `,
      [docId, ocrJobId, config.provider, requestedAt]
    );

    try {
      await dispatchExternalOcrJob(config, {
        docId: existing.doc_id,
        caseId: existing.case_id,
        name: existing.name,
        mimeType: existing.mime_type,
        sizeBytes: Number(existing.size_bytes || 0),
        blobUrl: existing.blob_url,
        ocrJobId,
        ocrProvider: config.provider,
        callbackUrl: config.callbackUrl,
        callbackToken: config.callbackToken,
        maxChars: RAG_LIMITS.maxCharsPerDoc,
      });
    } catch (dispatchError) {
      const errorText = cleanText(dispatchError?.message || dispatchError);

      await pool.query(
        `
        update thoxie_document
        set
          ocr_status = 'failed_external',
          ocr_error = $2,
          ocr_completed_at = now()
        where doc_id = $1
        `,
        [docId, errorText || "External OCR dispatch failed"]
      );

      return json(
        {
          ok: false,
          error: errorText || "External OCR dispatch failed",
          docId,
          ocrStatus: "failed_external",
        },
        502
      );
    }

    const refreshed = await getDocumentRow(pool, docId);

    return json({
      ok: true,
      docId: refreshed.doc_id,
      ocrStatus: refreshed.ocr_status || "queued_external",
      ocrJobId: refreshed.ocr_job_id || ocrJobId,
      ocrProvider: refreshed.ocr_provider || config.provider,
      ocrRequestedAt: refreshed.ocr_requested_at || requestedAt,
    });
  } catch (err) {
    return json(
      {
        ok: false,
        error: String(err?.message || err),
      },
      500
    );
  }
}
