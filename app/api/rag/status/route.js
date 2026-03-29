// PATH: /app/api/rag/status/route.js
// DIRECTORY: /app/api/rag/status
// FILE: route.js
// ACTION: FULL OVERWRITE

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
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
  "This case is already linked to a different browser session. Open it from the browser that created it.";

function json(data, status = 200, ownerToken = "") {
  const response = NextResponse.json(data, { status });

  if (ownerToken) {
    response.cookies.set({
      name: OWNER_COOKIE_NAME,
      value: ownerToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OWNER_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}

function safeStr(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

async function readCaseRow(pool, caseId) {
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

async function authorizeCaseAccess(req, caseId) {
  const normalizedCaseId = safeStr(caseId);

  if (!normalizedCaseId) {
    return { ok: false, status: 400, error: "Missing caseId", ownerTokenToSet: "" };
  }

  const pool = getPool();
  await ensureSchema(pool);

  const row = await readCaseRow(pool, normalizedCaseId);
  if (!row) {
    return { ok: true, caseId: normalizedCaseId, ownerTokenToSet: "" };
  }

  const rowOwnerHash = safeStr(row.owner_token_hash).toLowerCase();
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

  return {
    ok: true,
    caseId: normalizedCaseId,
    ownerTokenToSet: requestOwnerToken || createOwnerToken(),
  };
}

async function buildStatus(caseId) {
  const pool = getPool();
  await ensureSchema(pool);

  const docsResult = await pool.query(
    `
    select
      d.doc_id,
      d.name,
      d.mime_type,
      d.doc_type,
      d.evidence_category,
      d.extraction_method,
      d.ocr_status,
      d.uploaded_at,
      length(coalesce(d.extracted_text, '')) as text_length,
      coalesce(c.chunk_count, 0) as chunk_count
    from thoxie_document d
    left join (
      select doc_id, count(*) as chunk_count
      from thoxie_document_chunk
      group by doc_id
    ) c
      on c.doc_id = d.doc_id
    where d.case_id = $1
    order by d.uploaded_at desc, d.name asc
    `,
    [caseId]
  );

  const documents = docsResult.rows.map((row) => {
    const textLength = toNumber(row.text_length);
    const chunkCount = toNumber(row.chunk_count);

    return {
      docId: row.doc_id,
      name: row.name || "",
      mimeType: row.mime_type || "",
      docType: row.doc_type || "",
      evidenceCategory: row.evidence_category || "",
      extractionMethod: row.extraction_method || "",
      ocrStatus: row.ocr_status || "",
      uploadedAt: row.uploaded_at || "",
      textLength,
      chunkCount,
      readableByAI: textLength > 0 && chunkCount > 0,
    };
  });

  const indexedCount = documents.filter((doc) => doc.readableByAI).length;
  const chunkCount = documents.reduce((sum, doc) => sum + toNumber(doc.chunkCount), 0);

  return {
    ok: true,
    caseId,
    ready: indexedCount > 0,
    indexedCount,
    chunkCount,
    documents,
    docs: documents,
    summary: {
      documentCount: documents.length,
      readableByAICount: indexedCount,
      totalChunkCount: chunkCount,
    },
  };
}

function extractCaseIdFromRequest(req, body = null) {
  const fromBody = safeStr(body?.caseId);
  if (fromBody) return fromBody;

  try {
    const url = new URL(req.url);
    return safeStr(url.searchParams.get("caseId") || "");
  } catch {
    return "";
  }
}

export async function GET(req) {
  try {
    const caseId = extractCaseIdFromRequest(req);
    const access = await authorizeCaseAccess(req, caseId);

    if (!access.ok) {
      return json({ ok: false, error: access.error || "Access denied" }, access.status || 403);
    }

    return json(await buildStatus(access.caseId), 200, access.ownerTokenToSet || "");
  } catch (err) {
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = extractCaseIdFromRequest(req, body);
    const access = await authorizeCaseAccess(req, caseId);

    if (!access.ok) {
      return json({ ok: false, error: access.error || "Access denied" }, access.status || 403);
    }

    return json(await buildStatus(access.caseId), 200, access.ownerTokenToSet || "");
  } catch (err) {
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
}
