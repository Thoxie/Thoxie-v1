// PATH: /app/api/documents/route.js
// DIRECTORY: /app/api/documents
// FILE: route.js
// ACTION: FULL OVERWRITE

import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
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
  "This case is linked to a different browser session. Open it from the browser that created it.";

function safeStr(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function buildPreviewText(text) {
  return String(text || "").slice(0, 600);
}

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

function rowToDoc(row, { includeFullText = false } = {}) {
  if (!row) return null;

  const fullText = includeFullText ? String(row.extracted_text || "") : "";
  const previewText = row.preview_text != null
    ? String(row.preview_text || "")
    : buildPreviewText(includeFullText ? fullText : "");
  const textLength = toNumber(row.text_length ?? fullText.length);
  const chunkCount = toNumber(row.chunk_count);
  const hasStoredText = "has_stored_text" in row
    ? !!row.has_stored_text
    : textLength > 0 || !!previewText.trim();

  return {
    docId: row.doc_id,
    caseId: row.case_id,
    name: row.name || "",
    mimeType: row.mime_type || "",
    size: toNumber(row.size_bytes),
    sizeBytes: toNumber(row.size_bytes),
    docType: row.doc_type || "evidence",
    docTypeLabel: null,
    exhibitDescription: row.exhibit_description || "",
    evidenceCategory: row.evidence_category || "",
    evidenceSupports: Array.isArray(row.evidence_supports) ? row.evidence_supports : [],
    blobUrl: row.blob_url || "",
    uploadedAt: row.uploaded_at || "",
    previewText,
    extractedText: includeFullText ? fullText : "",
    extractionMethod: row.extraction_method || "",
    ocrStatus: row.ocr_status || "",
    ocrJobId: row.ocr_job_id || "",
    ocrProvider: row.ocr_provider || "",
    ocrRequestedAt: row.ocr_requested_at || "",
    ocrCompletedAt: row.ocr_completed_at || "",
    ocrError: row.ocr_error || "",
    textLength,
    chunkCount,
    hasStoredText,
    readableByAI: hasStoredText && chunkCount > 0,
    detailLoaded: includeFullText,
  };
}

function cleanPatch(patch) {
  const input = patch && typeof patch === "object" ? patch : {};
  const next = {};

  if ("docType" in input) {
    next.docType = safeStr(input.docType) || null;
  }

  if ("exhibitDescription" in input) {
    next.exhibitDescription = safeStr(input.exhibitDescription);
  }

  if ("evidenceCategory" in input) {
    next.evidenceCategory = safeStr(input.evidenceCategory);
  }

  if ("evidenceSupports" in input) {
    next.evidenceSupports = Array.isArray(input.evidenceSupports)
      ? input.evidenceSupports.map((item) => safeStr(item)).filter(Boolean)
      : [];
  }

  return next;
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

async function authorizeCaseAccess(req, caseId) {
  const normalizedCaseId = safeStr(caseId);

  if (!normalizedCaseId) {
    return {
      ok: false,
      status: 400,
      error: "Missing caseId",
      ownerTokenToSet: "",
      caseExists: false,
    };
  }

  const pool = getPool();
  await ensureSchema(pool);

  const row = await getCaseOwnershipRow(pool, normalizedCaseId);
  if (!row) {
    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet: "",
      caseExists: false,
    };
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
        caseExists: true,
      };
    }

    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet: requestOwnerToken || "",
      caseExists: true,
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
      caseExists: true,
    };
  }

  const refreshedRow = await getCaseOwnershipRow(pool, normalizedCaseId);
  const refreshedOwnerHash = safeStr(refreshedRow?.owner_token_hash).toLowerCase();

  if (refreshedOwnerHash && refreshedOwnerHash === ownerTokenHash) {
    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet,
      caseExists: true,
    };
  }

  return {
    ok: false,
    status: 403,
    error: OWNERSHIP_ERROR_MESSAGE,
    ownerTokenToSet: "",
    caseExists: true,
  };
}

async function getDocumentRow(pool, docId, { includeFullText = false } = {}) {
  const result = await pool.query(
    `
    select
      d.doc_id,
      d.case_id,
      d.name,
      d.mime_type,
      d.size_bytes,
      d.doc_type,
      d.exhibit_description,
      d.evidence_category,
      d.evidence_supports,
      d.blob_url,
      d.uploaded_at,
      ${includeFullText ? "d.extracted_text," : ""}
      substring(coalesce(d.extracted_text, '') from 1 for 600) as preview_text,
      length(coalesce(d.extracted_text, '')) as text_length,
      (length(coalesce(d.extracted_text, '')) > 0) as has_stored_text,
      d.extraction_method,
      d.ocr_status,
      d.ocr_job_id,
      d.ocr_provider,
      d.ocr_requested_at,
      d.ocr_completed_at,
      d.ocr_error,
      (
        select count(*)
        from thoxie_document_chunk c
        where c.doc_id = d.doc_id
      ) as chunk_count
    from thoxie_document d
    where d.doc_id = $1
    limit 1
    `,
    [docId]
  );

  return result.rows[0] || null;
}

async function listDocumentRowsByCaseId(pool, caseId) {
  const result = await pool.query(
    `
    select
      d.doc_id,
      d.case_id,
      d.name,
      d.mime_type,
      d.size_bytes,
      d.doc_type,
      d.exhibit_description,
      d.evidence_category,
      d.evidence_supports,
      d.blob_url,
      d.uploaded_at,
      substring(coalesce(d.extracted_text, '') from 1 for 600) as preview_text,
      length(coalesce(d.extracted_text, '')) as text_length,
      (length(coalesce(d.extracted_text, '')) > 0) as has_stored_text,
      d.extraction_method,
      d.ocr_status,
      d.ocr_job_id,
      d.ocr_provider,
      d.ocr_requested_at,
      d.ocr_completed_at,
      d.ocr_error,
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

  return result.rows || [];
}

async function openBlobResponse(row) {
  const headers = {};
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const blobRes = await fetch(row.blob_url, {
    headers,
    cache: "no-store",
  });

  if (!blobRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Could not read blob file (${blobRes.status})`,
      },
      { status: 502 }
    );
  }

  const contentType = row.mime_type || blobRes.headers.get("content-type") || "application/octet-stream";
  const safeName = String(row.name || "document")
    .replace(/"/g, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "");

  return new NextResponse(blobRes.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function deleteBlobIfPresent(blobUrl) {
  const url = safeStr(blobUrl);
  if (!url) return { ok: true };

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      await del(url, { token });
    } else {
      await del(url);
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || "Blob delete failed",
    };
  }
}

export async function GET(req) {
  try {
    const pool = getPool();
    await ensureSchema(pool);

    const { searchParams } = new URL(req.url);
    const caseId = safeStr(searchParams.get("caseId"));
    const docId = safeStr(searchParams.get("docId"));
    const open = safeStr(searchParams.get("open")) === "1";

    if (open) {
      if (!docId) {
        return json({ ok: false, error: "Missing docId" }, 400);
      }

      const row = await getDocumentRow(pool, docId, { includeFullText: false });
      if (!row) {
        return json({ ok: false, error: "Document not found" }, 404);
      }

      const access = await authorizeCaseAccess(req, row.case_id);
      if (!access.ok) {
        return json({ ok: false, error: access.error || OWNERSHIP_ERROR_MESSAGE }, access.status || 403);
      }

      if (!row.blob_url) {
        return json(
          { ok: false, error: "This document does not have a stored file blob yet" },
          404,
          access.ownerTokenToSet || ""
        );
      }

      const response = await openBlobResponse(row);
      return attachOwnerCookie(response, access.ownerTokenToSet || "");
    }

    if (docId) {
      const row = await getDocumentRow(pool, docId, { includeFullText: true });
      if (!row) {
        return json({ ok: false, error: "Document not found" }, 404);
      }

      const access = await authorizeCaseAccess(req, row.case_id);
      if (!access.ok) {
        return json({ ok: false, error: access.error || OWNERSHIP_ERROR_MESSAGE }, access.status || 403);
      }

      return json(
        {
          ok: true,
          document: rowToDoc(row, { includeFullText: true }),
        },
        200,
        access.ownerTokenToSet || ""
      );
    }

    if (!caseId) {
      return json({ ok: false, error: "Missing caseId" }, 400);
    }

    const access = await authorizeCaseAccess(req, caseId);
    if (!access.ok) {
      return json({ ok: false, error: access.error || OWNERSHIP_ERROR_MESSAGE }, access.status || 403);
    }

    const rows = await listDocumentRowsByCaseId(pool, caseId);

    return json(
      {
        ok: true,
        documents: rows.map((row) => rowToDoc(row, { includeFullText: false })),
      },
      200,
      access.ownerTokenToSet || ""
    );
  } catch (err) {
    console.error("DOCUMENTS GET ERROR:", err);

    return json(
      { ok: false, error: err?.message || "Failed to load documents" },
      500
    );
  }
}

export async function PATCH(req) {
  try {
    const pool = getPool();
    await ensureSchema(pool);

    const body = await req.json();
    const docId = safeStr(body?.docId);
    const patch = cleanPatch(body?.patch);

    if (!docId) {
      return json({ ok: false, error: "Missing docId" }, 400);
    }

    const current = await getDocumentRow(pool, docId, { includeFullText: false });
    if (!current) {
      return json({ ok: false, error: "Document not found" }, 404);
    }

    const access = await authorizeCaseAccess(req, current.case_id);
    if (!access.ok) {
      return json({ ok: false, error: access.error || OWNERSHIP_ERROR_MESSAGE }, access.status || 403);
    }

    const nextDocType = "docType" in patch ? patch.docType : current.doc_type;
    const nextExhibitDescription =
      "exhibitDescription" in patch ? patch.exhibitDescription : current.exhibit_description;
    const nextEvidenceCategory =
      "evidenceCategory" in patch ? patch.evidenceCategory : current.evidence_category;
    const nextEvidenceSupports =
      "evidenceSupports" in patch
        ? patch.evidenceSupports
        : Array.isArray(current.evidence_supports)
          ? current.evidence_supports
          : [];

    await pool.query(
      `
      update thoxie_document
      set
        doc_type = $2,
        exhibit_description = $3,
        evidence_category = $4,
        evidence_supports = $5
      where doc_id = $1
      `,
      [
        docId,
        nextDocType,
        nextExhibitDescription,
        nextEvidenceCategory,
        JSON.stringify(nextEvidenceSupports),
      ]
    );

    const refreshed = await getDocumentRow(pool, docId, { includeFullText: false });

    return json(
      {
        ok: true,
        document: rowToDoc(refreshed, { includeFullText: false }),
      },
      200,
      access.ownerTokenToSet || ""
    );
  } catch (err) {
    console.error("DOCUMENTS PATCH ERROR:", err);

    return json(
      { ok: false, error: err?.message || "Failed to update document" },
      500
    );
  }
}

export async function DELETE(req) {
  try {
    const pool = getPool();
    await ensureSchema(pool);

    const body = await req.json();
    const docId = safeStr(body?.docId);

    if (!docId) {
      return json({ ok: false, error: "Missing docId" }, 400);
    }

    const current = await getDocumentRow(pool, docId, { includeFullText: false });
    if (!current) {
      return json({ ok: false, error: "Document not found" }, 404);
    }

    const access = await authorizeCaseAccess(req, current.case_id);
    if (!access.ok) {
      return json({ ok: false, error: access.error || OWNERSHIP_ERROR_MESSAGE }, access.status || 403);
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const deleteResult = await client.query(
        `
        delete from thoxie_document
        where doc_id = $1
        returning doc_id, case_id, name, blob_url
        `,
        [docId]
      );

      if (!deleteResult.rows[0]) {
        await client.query("ROLLBACK");
        return json({ ok: false, error: "Document not found" }, 404, access.ownerTokenToSet || "");
      }

      await client.query("COMMIT");
    } catch (dbErr) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw dbErr;
    } finally {
      client.release();
    }

    const blobResult = await deleteBlobIfPresent(current.blob_url);

    return json(
      {
        ok: true,
        deleted: {
          docId: current.doc_id,
          caseId: current.case_id,
          name: current.name || "",
        },
        blobDeleted: !!blobResult.ok,
        blobWarning: blobResult.ok ? "" : blobResult.error,
      },
      200,
      access.ownerTokenToSet || ""
    );
  } catch (err) {
    console.error("DOCUMENTS DELETE ERROR:", err);

    return json(
      { ok: false, error: err?.message || "Failed to delete document" },
      500
    );
  }
}
