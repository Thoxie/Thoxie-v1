// PATH: /app/api/ocr/retry/route.js
// DIRECTORY: /app/api/ocr/retry
// FILE: route.js
// ACTION: FULL OVERWRITE

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
import { RAG_LIMITS } from "../../../_lib/rag/limits";
import {
  createOwnerToken,
  getOwnerTokenFromRequest,
  hashOwnerToken,
  OWNER_COOKIE_MAX_AGE_SECONDS,
  OWNER_COOKIE_NAME,
} from "@/app/_lib/server/caseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNERSHIP_ERROR_MESSAGE =
  "This case is linked to a different browser session. Open it from the browser that created it.";

function attachOwnerCookie(response, ownerToken) {
  if (!ownerToken) {
    return response;
  }

  response.cookies.set({
    name: OWNER_COOKIE_NAME,
    value: ownerToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

function json(data, status = 200, ownerToken = "") {
  return attachOwnerCookie(NextResponse.json(data, { status }), ownerToken);
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

async function getCaseOwnershipRow(pool, caseId) {
  const result = await pool.query(
    `
    select case_id, owner_token_hash
    from thoxie_case
    where case_id = $1
    limit 1
    `,
    [caseId]
  );

  return result.rows[0] || null;
}

async function authorizeCaseAccess(req, pool, caseId) {
  const normalizedCaseId = cleanText(caseId);

  if (!normalizedCaseId) {
    return { ok: false, status: 400, error: "Missing caseId", ownerTokenToSet: "" };
  }

  const row = await getCaseOwnershipRow(pool, normalizedCaseId);
  if (!row) {
    return { ok: false, status: 404, error: "Case not found", ownerTokenToSet: "" };
  }

  const rowOwnerHash = cleanText(row.owner_token_hash).toLowerCase();
  const requestOwnerToken = getOwnerTokenFromRequest(req);
  const requestOwnerHash = hashOwnerToken(requestOwnerToken);

  if (rowOwnerHash) {
    if (!requestOwnerHash || requestOwnerHash !== rowOwnerHash) {
      return {
        ok: false,
        status: 403,
        error: OWNERSHIP_ERROR_MESSAGE,
        ownerTokenToSet: "",
      };
    }

    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet: requestOwnerToken || "",
    };
  }

  const ownerTokenToSet = requestOwnerToken || createOwnerToken();
  const ownerTokenHash = hashOwnerToken(ownerTokenToSet);

  const claimResult = await pool.query(
    `
    update thoxie_case
    set
      owner_token_hash = $2,
      owner_claimed_at = coalesce(owner_claimed_at, now()),
      owner_last_seen_at = now()
    where case_id = $1
      and coalesce(owner_token_hash, '') = ''
    returning case_id, owner_token_hash
    `,
    [normalizedCaseId, ownerTokenHash]
  );

  const claimedRow = claimResult.rows[0] || null;
  if (claimedRow) {
    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet,
    };
  }

  const refreshedRow = await getCaseOwnershipRow(pool, normalizedCaseId);
  const refreshedOwnerHash = cleanText(refreshedRow?.owner_token_hash).toLowerCase();

  if (refreshedOwnerHash && refreshedOwnerHash === ownerTokenHash) {
    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet,
    };
  }

  return {
    ok: false,
    status: 403,
    error: OWNERSHIP_ERROR_MESSAGE,
    ownerTokenToSet: "",
  };
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
  let ownerTokenToSet = "";

  try {
    const body = await req.json();
    const docId = cleanText(body?.docId || "");

    if (!docId) {
      return json({ ok: false, error: "Missing docId" }, 400);
    }

    const pool = getPool();
    await ensureSchema(pool);

    const existing = await getDocumentRow(pool, docId);
    if (!existing) {
      return json({ ok: false, error: "Document not found" }, 404);
    }

    const access = await authorizeCaseAccess(req, pool, existing.case_id);
    if (!access.ok) {
      return json(
        { ok: false, error: access.error || OWNERSHIP_ERROR_MESSAGE },
        access.status || 403,
        access.ownerTokenToSet || ""
      );
    }

    ownerTokenToSet = access.ownerTokenToSet || "";

    const config = getExternalOcrConfig(req);
    if (!config.enabled) {
      return json(
        {
          ok: false,
          error:
            "External OCR is not configured. Set THOXIE_OCR_SERVICE_URL, THOXIE_OCR_CALLBACK_TOKEN, and THOXIE_APP_URL or NEXT_PUBLIC_APP_URL.",
        },
        400,
        ownerTokenToSet
      );
    }

    if (!String(existing.mime_type || "").toLowerCase().includes("pdf")) {
      return json(
        { ok: false, error: "Only PDF documents can be retried for scanned-PDF OCR" },
        400,
        ownerTokenToSet
      );
    }

    if (!existing.blob_url) {
      return json(
        { ok: false, error: "Document does not have a stored blob URL" },
        400,
        ownerTokenToSet
      );
    }

    if (!isRetryEligible(existing.ocr_status)) {
      return json(
        {
          ok: false,
          error: `Document OCR status is not retry-eligible: ${existing.ocr_status || "unknown"}`,
        },
        409,
        ownerTokenToSet
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
          caseId: existing.case_id,
          ocrStatus: "failed_external",
        },
        502,
        ownerTokenToSet
      );
    }

    const refreshed = await getDocumentRow(pool, docId);

    return json(
      {
        ok: true,
        docId: refreshed.doc_id,
        caseId: refreshed.case_id,
        ocrStatus: refreshed.ocr_status || "queued_external",
        ocrJobId: refreshed.ocr_job_id || ocrJobId,
        ocrProvider: refreshed.ocr_provider || config.provider,
        ocrRequestedAt: refreshed.ocr_requested_at || requestedAt,
      },
      200,
      ownerTokenToSet
    );
  } catch (err) {
    return json(
      {
        ok: false,
        error: String(err?.message || err),
      },
      500,
      ownerTokenToSet
    );
  }
}
