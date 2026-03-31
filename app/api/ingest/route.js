// PATH: /app/api/ingest/route.js
// DIRECTORY: /app/api/ingest
// FILE: route.js
// ACTION: OVERWRITE ENTIRE FILE

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
import { extractTextFromBuffer } from "../../_lib/documents/extractText";
import { chunkText } from "../../_lib/rag/chunkText";
import { RAG_LIMITS } from "../../_lib/rag/limits";
import {
  createOwnerToken,
  getOwnerTokenFromRequest,
  hashOwnerToken,
  OWNER_COOKIE_MAX_AGE_SECONDS,
  OWNER_COOKIE_NAME,
} from "@/app/_lib/server/caseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OCR_INLINE_MAX_BYTES = 4_000_000;
const OWNERSHIP_ERROR_MESSAGE =
  "This case is linked to a different browser session. Open it from the browser that created it.";

function logIngestDiagnostic(payload = {}) {
  console.info(
    "UPLOAD_DIAGNOSTIC",
    JSON.stringify({
      scope: "ingest",
      ...payload,
    })
  );
}

function attachOwnerCookie(response, ownerToken) {
  if (!ownerToken) return response;

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

function normalizeBase64(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const withoutPrefix = raw.includes("base64,") ? raw.slice(raw.indexOf("base64,") + 7) : raw;
  return withoutPrefix.replace(/\s+/g, "");
}

function stripNullBytes(value) {
  return String(value || "").replace(/\u0000/g, "");
}

function cleanDbText(value) {
  return stripNullBytes(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function cleanDbLabel(value) {
  return cleanDbText(value).replace(/\s+/g, " ").trim();
}

function cleanFlagArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanDbLabel(item))
    .filter(Boolean)
    .slice(0, 20);
}

function safeUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeSegment(value, fallback = "file") {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || fallback;
}

function fileExtension(name) {
  const raw = String(name || "").trim().toLowerCase();
  const idx = raw.lastIndexOf(".");
  return idx >= 0 ? raw.slice(idx) : "";
}

function inferMimeType(name, rawMimeType) {
  const declared = String(rawMimeType || "").trim().toLowerCase();
  if (declared) return declared;

  switch (fileExtension(name)) {
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".doc":
      return "application/msword";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain";
    case ".md":
      return "text/markdown";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function buildBlobPath(caseId, docId, name) {
  const safeCaseId = safeSegment(caseId, "case");
  const safeDocId = safeSegment(docId, "doc");
  const safeName = safeSegment(name, "upload");
  return `cases/${safeCaseId}/docs/${safeDocId}-${safeName}`;
}

function getBlobPutOptions(mimeType) {
  const options = {
    access: "private",
    contentType: mimeType || "application/octet-stream",
    addRandomSuffix: false,
  };

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    options.token = token;
  }

  return options;
}

function isImageLike(mimeType, name) {
  const mt = String(mimeType || "").toLowerCase();
  const ext = fileExtension(name);

  return (
    mt.startsWith("image/") ||
    ext === ".png" ||
    ext === ".jpg" ||
    ext === ".jpeg" ||
    ext === ".webp" ||
    ext === ".bmp" ||
    ext === ".gif" ||
    ext === ".tif" ||
    ext === ".tiff" ||
    ext === ".heic" ||
    ext === ".heif"
  );
}

function isPdfLike(mimeType, name) {
  const mt = String(mimeType || "").toLowerCase();
  const ext = fileExtension(name);
  return mt.includes("pdf") || ext === ".pdf";
}

function isDocxLike(mimeType, name) {
  const mt = String(mimeType || "").toLowerCase();
  const ext = fileExtension(name);

  return (
    ext === ".docx" ||
    mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mt.includes("officedocument.wordprocessingml.document") ||
    mt.includes("wordprocessingml")
  );
}

function getExtractionMaxChars(mimeType, name) {
  const configuredStoredMax = Number(RAG_LIMITS.maxStoredCharsPerDoc);
  const storedMaxChars = configuredStoredMax > 0 ? configuredStoredMax : null;

  if (isDocxLike(mimeType, name)) {
    return storedMaxChars;
  }

  if (isPdfLike(mimeType, name)) {
    return storedMaxChars;
  }

  return Number(RAG_LIMITS.maxCharsPerDoc || 180_000);
}

function clipForIndexing(value) {
  const text = cleanDbText(value);
  const maxChars = Number(RAG_LIMITS.maxCharsPerDoc || 180_000);
  if (!maxChars || text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim();
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

function deriveOcrStatus({ extracted, mimeType, name, externalOcrEnabled }) {
  if (extracted?.ok) {
    return extracted?.method === "ocr" ? "completed" : "not_needed";
  }

  const reason = String(extracted?.reason || "").trim();
  const pdfLike = isPdfLike(mimeType, name);

  if (reason === "ocr_deferred_large_image") {
    return "deferred_large_image";
  }

  if (pdfLike) {
    if (externalOcrEnabled) {
      return "queued_external";
    }

    if (reason === "empty_pdf_text_layer") {
      return "needed_scanned_pdf";
    }

    if (reason === "timeout") {
      return "failed_timeout";
    }

    if (reason.startsWith("missing_parser:")) {
      return "failed_parser";
    }

    if (reason.startsWith("parse_error:")) {
      return "failed_parse";
    }

    return "needed_scanned_pdf";
  }

  if (isImageLike(mimeType, name)) {
    return "needed_image_ocr";
  }

  if (reason === "timeout") {
    return "failed_timeout";
  }

  if (reason.startsWith("parse_error:")) {
    return "failed_parse";
  }

  if (reason.startsWith("missing_parser:")) {
    return "failed_parser";
  }

  return "not_applicable";
}

function buildExtractionNote(extracted, name, mimeType, ocrStatus, ocrError = "") {
  const reason = String(extracted?.reason || "").trim();
  const ext = fileExtension(name);
  const imageLike = isImageLike(mimeType, name);
  const pdfLike = isPdfLike(mimeType, name);

  if (ocrStatus === "queued_external") {
    return "The PDF was saved. Searchable text will appear after external OCR processing completes.";
  }

  if (ocrStatus === "failed_external") {
    return `The file was saved, but the external OCR handoff failed: ${ocrError || "External OCR dispatch failed"}`;
  }

  if (!reason) return "";

  if (reason === "unsupported_legacy_word_doc") {
    return "Legacy .doc files are not supported in beta. Save the file as .docx and re-upload it.";
  }

  if (reason === "empty_pdf_text_layer" && pdfLike) {
    return "The PDF was saved, but no machine-readable text layer was found. This appears to be a scanned PDF.";
  }

  if (reason === "too_large") {
    return "The uploaded file exceeded the current extraction size limit.";
  }

  if (reason === "ocr_deferred_large_image") {
    return "The image was saved, but OCR was skipped because the file is too large for the current inline limit.";
  }

  if (reason === "timeout" && imageLike) {
    return "The image was saved, but OCR timed out before text could be stored.";
  }

  if (reason === "unsupported_mime") {
    if (ext === ".doc") {
      return "Legacy .doc files are not supported in beta. Save the file as .docx and re-upload it.";
    }
    return "This file type uploaded successfully, but text extraction is not enabled for it yet.";
  }

  if (reason.startsWith("parse_error:")) {
    return `The file uploaded, but extraction failed: ${reason.slice("parse_error:".length)}`;
  }

  if (reason.startsWith("missing_parser:")) {
    return `The file uploaded, but the server parser could not start: ${reason.slice("missing_parser:".length)}`;
  }

  if (reason === "empty") {
    return "The file uploaded successfully, but no readable text was extracted.";
  }

  return reason;
}

async function upsertDocumentRow(poolOrClient, values) {
  const {
    docId,
    caseId,
    name,
    mimeType,
    sizeBytes,
    docType,
    blobUrl,
    extractedText,
    extractionMethod,
    ocrStatus,
    ocrJobId,
    ocrProvider,
    ocrRequestedAt,
    ocrCompletedAt,
    ocrError,
  } = values;

  await poolOrClient.query(
    `
    insert into thoxie_document
      (
        doc_id,
        case_id,
        name,
        mime_type,
        size_bytes,
        doc_type,
        blob_url,
        extracted_text,
        extraction_method,
        ocr_status,
        ocr_job_id,
        ocr_provider,
        ocr_requested_at,
        ocr_completed_at,
        ocr_error,
        uploaded_at
      )
    values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
    on conflict (doc_id) do update set
      case_id = excluded.case_id,
      name = excluded.name,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      doc_type = excluded.doc_type,
      blob_url = excluded.blob_url,
      extracted_text = excluded.extracted_text,
      extraction_method = excluded.extraction_method,
      ocr_status = excluded.ocr_status,
      ocr_job_id = excluded.ocr_job_id,
      ocr_provider = excluded.ocr_provider,
      ocr_requested_at = excluded.ocr_requested_at,
      ocr_completed_at = excluded.ocr_completed_at,
      ocr_error = excluded.ocr_error
    `,
    [
      docId,
      caseId,
      name,
      mimeType,
      sizeBytes,
      docType,
      blobUrl,
      extractedText,
      extractionMethod,
      ocrStatus,
      ocrJobId,
      ocrProvider,
      ocrRequestedAt,
      ocrCompletedAt,
      ocrError,
    ]
  );
}

function normalizeChunkRecords(rawChunks) {
  const list = Array.isArray(rawChunks) ? rawChunks : [];

  return list
    .map((chunk, index) => {
      if (typeof chunk === "string") {
        const text = cleanDbText(chunk);
        if (!text) return null;
        return {
          chunkIndex: index,
          text,
          chunkKind: "",
          chunkLabel: `section ${index + 1}`,
          sectionLabel: "",
          pageStart: null,
          pageEnd: null,
          charStart: null,
          charEnd: null,
          structuralFlags: [],
        };
      }

      if (!chunk || typeof chunk !== "object") return null;

      const text = cleanDbText(chunk.text || "");
      if (!text) return null;

      const pageStart = Number.isFinite(Number(chunk.pageStart)) ? Number(chunk.pageStart) : null;
      const pageEnd = Number.isFinite(Number(chunk.pageEnd)) ? Number(chunk.pageEnd) : null;
      const charStart = Number.isFinite(Number(chunk.charStart)) ? Number(chunk.charStart) : null;
      const charEnd = Number.isFinite(Number(chunk.charEnd)) ? Number(chunk.charEnd) : null;

      return {
        chunkIndex: Number.isFinite(Number(chunk.chunkIndex)) ? Number(chunk.chunkIndex) : index,
        text,
        chunkKind: cleanDbLabel(chunk.chunkKind || ""),
        chunkLabel: cleanDbLabel(chunk.label || chunk.chunkLabel || "") || `section ${index + 1}`,
        sectionLabel: cleanDbLabel(chunk.sectionLabel || ""),
        pageStart,
        pageEnd,
        charStart,
        charEnd,
        structuralFlags: cleanFlagArray(chunk.structuralFlags),
      };
    })
    .filter(Boolean)
    .slice(0, 250);
}

async function persistChunks(poolOrClient, { caseId, docId, extractedText, name }) {
  const indexableText = clipForIndexing(extractedText || "");
  const rawChunks = chunkText(indexableText, { returnObjects: true });
  let chunks = normalizeChunkRecords(rawChunks);

  if (chunks.length === 0 && indexableText) {
    chunks = [
      {
        chunkIndex: 0,
        text: indexableText,
        chunkKind: "body",
        chunkLabel: "section 1",
        sectionLabel: "",
        pageStart: null,
        pageEnd: null,
        charStart: null,
        charEnd: null,
        structuralFlags: ["fallback_single_chunk"],
      },
    ];
  }

  logIngestDiagnostic({
    event: "chunk_persist_start",
    doc_id: docId,
    file: name || "(unnamed)",
    stored_text_length: String(extractedText || "").length,
    indexed_text_length: indexableText.length,
    chunks_produced: Array.isArray(rawChunks) ? rawChunks.length : 0,
    chunks_capped: chunks.length,
  });

  await poolOrClient.query(
    `
    delete from thoxie_document_chunk
    where doc_id = $1
    `,
    [docId]
  );

  let insertedCount = 0;

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (!chunk?.text) continue;

    await poolOrClient.query(
      `
      insert into thoxie_document_chunk
        (
          chunk_id,
          case_id,
          doc_id,
          chunk_index,
          chunk_text,
          chunk_kind,
          chunk_label,
          section_label,
          page_start,
          page_end,
          char_start,
          char_end,
          structural_flags
        )
      values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
      on conflict (doc_id, chunk_index)
      do update set
        chunk_text = excluded.chunk_text,
        chunk_kind = excluded.chunk_kind,
        chunk_label = excluded.chunk_label,
        section_label = excluded.section_label,
        page_start = excluded.page_start,
        page_end = excluded.page_end,
        char_start = excluded.char_start,
        char_end = excluded.char_end,
        structural_flags = excluded.structural_flags
      `,
      [
        `${docId}:${chunk.chunkIndex}`,
        caseId,
        docId,
        chunk.chunkIndex,
        chunk.text,
        chunk.chunkKind,
        chunk.chunkLabel,
        chunk.sectionLabel,
        chunk.pageStart,
        chunk.pageEnd,
        chunk.charStart,
        chunk.charEnd,
        JSON.stringify(chunk.structuralFlags || []),
      ]
    );

    insertedCount += 1;
  }

  logIngestDiagnostic({
    event: "chunk_persist_complete",
    doc_id: docId,
    file: name || "(unnamed)",
    chunks_created: insertedCount,
  });

  return insertedCount;
}

async function extractForIngest({ mimeType, name, buffer, sizeBytes }) {
  const imageLike = isImageLike(mimeType, name);

  if (imageLike && Number(sizeBytes || 0) > OCR_INLINE_MAX_BYTES) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: "ocr_deferred_large_image",
    };
  }

  return await extractTextFromBuffer({
    buffer,
    mimeType,
    filename: name,
    limits: {
      maxBytes: RAG_LIMITS.maxUploadBytesPerDoc,
      ocrTimeoutMs: 20_000,
      pdfTextTimeoutMs: 15_000,
      allowInlinePdfOcr: false,
      allowPdf2JsonFallback: false,
    },
    maxChars: getExtractionMaxChars(mimeType, name),
  });
}

async function dispatchExternalOcrJob(config, payload) {
  if (!config?.enabled) {
    return { ok: false, reason: "external_ocr_not_configured" };
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

async function updateExternalDispatchFailure(pool, { docId, errorMessage }) {
  await pool.query(
    `
    update thoxie_document
    set
      ocr_status = 'failed_external',
      ocr_error = $2,
      ocr_completed_at = now()
    where doc_id = $1
    `,
    [docId, cleanDbText(errorMessage || "External OCR dispatch failed")]
  );
}

function getRequestContentType(req) {
  return String(req.headers.get("content-type") || "").toLowerCase();
}

async function parseJsonDocuments(body) {
  const caseId = cleanDbText(body?.caseId || "");
  const inputDocs = Array.isArray(body?.documents) ? body.documents : [];

  const documents = inputDocs.map((doc) => ({
    source: "json",
    name: cleanDbText(doc?.name || "") || "(unnamed)",
    mimeType: inferMimeType(doc?.name, cleanDbText(doc?.mimeType || "")),
    sizeBytes: Number(doc?.size || 0),
    docType: cleanDbText(doc?.docType || "") || "evidence",
    base64: normalizeBase64(doc?.base64 || ""),
    buffer: null,
    file: null,
  }));

  return { caseId, documents };
}

function isUploadFile(entry) {
  return !!entry && typeof entry.arrayBuffer === "function" && typeof entry.name === "string";
}

async function parseMultipartDocuments(req) {
  const form = await req.formData();
  const caseId = cleanDbText(form.get("caseId") || "");
  const docType = cleanDbText(form.get("docType") || "") || "evidence";
  const files = form.getAll("files");

  const documents = [];

  for (const entry of files) {
    if (!isUploadFile(entry)) continue;

    const name = cleanDbText(entry.name || "") || "(unnamed)";
    const mimeType = inferMimeType(name, entry.type || "");
    const sizeBytes = Number(entry.size || 0);

    documents.push({
      source: "multipart",
      name,
      mimeType,
      sizeBytes,
      docType,
      buffer: null,
      base64: "",
      file: entry,
    });
  }

  return { caseId, documents };
}

async function resolveDocumentBuffer(doc) {
  if (doc?.buffer instanceof Buffer) {
    return doc.buffer;
  }

  if (doc?.file && typeof doc.file.arrayBuffer === "function") {
    const arrayBuffer = await doc.file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const base64 = normalizeBase64(doc?.base64 || "");
  if (base64) {
    return Buffer.from(base64, "base64");
  }

  return null;
}

function buildUploadedResponseRow(row) {
  const extractedText = String(row?.extractedText || "");
  const previewText = extractedText.slice(0, 600);
  const chunkCount = Number(row?.chunkCount || 0);
  const hasStoredText = !!extractedText.trim();
  const storedTextLength = extractedText.length;

  return {
    docId: row.docId,
    caseId: row.caseId,
    name: row.name || "",
    mimeType: row.mimeType || "",
    size: Number(row.sizeBytes || 0),
    sizeBytes: Number(row.sizeBytes || 0),
    docType: row.docType || "evidence",
    exhibitDescription: "",
    evidenceCategory: "",
    evidenceSupports: [],
    blobUrl: row.blobUrl || "",
    uploadedAt: row.uploadedAt || "",
    previewText,
    extractedText: "",
    extractionMethod: row.extractionMethod || "",
    extraction: {
      method: row.extractionMethod || "",
      note: row.note || "",
    },
    ocrStatus: row.ocrStatus || "",
    ocrJobId: row.ocrJobId || "",
    ocrProvider: row.ocrProvider || "",
    ocrRequestedAt: row.ocrRequestedAt || "",
    ocrCompletedAt: row.ocrCompletedAt || "",
    ocrError: row.ocrError || "",
    textLength: storedTextLength,
    storedTextLength,
    chunkCount,
    hasStoredText,
    readableByAI: hasStoredText && chunkCount > 0,
    detailLoaded: false,
    note: row.note || "",
  };
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

async function authorizeCaseUploadAccess(req, pool, caseId) {
  const normalizedCaseId = cleanDbText(caseId);

  if (!normalizedCaseId) {
    return {
      ok: false,
      status: 400,
      error: "Missing caseId",
      ownerTokenToSet: "",
    };
  }

  const row = await getCaseOwnershipRow(pool, normalizedCaseId);
  if (!row) {
    return {
      ok: false,
      status: 404,
      error: "Case not found. Save the case before uploading documents.",
      ownerTokenToSet: "",
    };
  }

  const rowOwnerHash = cleanDbText(row.owner_token_hash).toLowerCase();
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
  const refreshedOwnerHash = cleanDbText(refreshedRow?.owner_token_hash).toLowerCase();

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

export async function POST(req) {
  const pool = getPool();
  await ensureSchema(pool);

  const failed = [];
  const uploaded = [];
  const externalOcrConfig = getExternalOcrConfig(req);
  let ownerTokenToSet = "";

  try {
    const contentType = getRequestContentType(req);
    const parsed =
      contentType.includes("multipart/form-data")
        ? await parseMultipartDocuments(req)
        : await parseJsonDocuments(await req.json());

    const caseId = cleanDbText(parsed?.caseId || "");
    const documents = Array.isArray(parsed?.documents) ? parsed.documents : [];

    if (!caseId) {
      return json({ ok: false, error: "Missing caseId" }, 400);
    }

    if (!documents.length) {
      return json({ ok: false, error: "No documents provided" }, 400);
    }

    const access = await authorizeCaseUploadAccess(req, pool, caseId);
    if (!access.ok) {
      return json(
        { ok: false, error: access.error || OWNERSHIP_ERROR_MESSAGE },
        access.status || 403,
        access.ownerTokenToSet || ""
      );
    }

    ownerTokenToSet = access.ownerTokenToSet || "";

    for (const doc of documents) {
      const docId = safeUuid();
      const name = cleanDbText(doc?.name || "") || "(unnamed)";
      const mimeType = inferMimeType(name, doc?.mimeType || "");
      const docType = cleanDbText(doc?.docType || "") || "evidence";

      try {
        const buffer = await resolveDocumentBuffer(doc);
        if (!buffer || buffer.length === 0) {
          throw new Error("Empty upload buffer");
        }

        const finalSizeBytes = Number(doc?.sizeBytes || 0) || buffer.length;
        const blobPath = buildBlobPath(caseId, docId, name);
        const blob = await put(blobPath, buffer, getBlobPutOptions(mimeType));

        const extracted = await extractForIngest({
          mimeType,
          name,
          buffer,
          sizeBytes: finalSizeBytes,
        });

        let ocrStatus = deriveOcrStatus({
          extracted,
          mimeType,
          name,
          externalOcrEnabled: externalOcrConfig.enabled,
        });

        let extractionMethod = extracted?.ok ? cleanDbLabel(extracted.method || "") : "";
        let extractedText = extracted?.ok ? cleanDbText(extracted.text || "") : "";
        let ocrJobId = "";
        let ocrProvider = "";
        let ocrRequestedAt = null;
        let ocrCompletedAt = extracted?.ok && extractionMethod === "ocr" ? new Date().toISOString() : null;
        let ocrError = extracted?.ok || ocrStatus === "queued_external"
          ? ""
          : cleanDbText(extracted?.reason || "");
        let chunkCount = 0;
        const uploadedAt = new Date().toISOString();

        await upsertDocumentRow(pool, {
          docId,
          caseId,
          name,
          mimeType,
          sizeBytes: finalSizeBytes,
          docType,
          blobUrl: blob?.url || "",
          extractedText,
          extractionMethod,
          ocrStatus,
          ocrJobId,
          ocrProvider,
          ocrRequestedAt,
          ocrCompletedAt,
          ocrError,
        });

        logIngestDiagnostic({
          event: "document_row_upserted",
          doc_id: docId,
          case_id: caseId,
          file: name,
          extraction_method: extractionMethod || extracted?.method || "",
          ocr_status: ocrStatus,
          stored_text_length: extractedText.length,
          extracted_text_written: extractedText.length > 0,
          ocr_error: ocrError,
        });

        if (extractedText) {
          chunkCount = await persistChunks(pool, {
            caseId,
            docId,
            extractedText,
            name,
          });
        }

        if (!extracted?.ok && ocrStatus === "queued_external") {
          try {
            const dispatch = await dispatchExternalOcrJob(externalOcrConfig, {
              docId,
              caseId,
              name,
              mimeType,
              blobUrl: blob?.url || "",
              callbackUrl: externalOcrConfig.callbackUrl,
              callbackToken: externalOcrConfig.callbackToken,
            });

            if (dispatch?.ok) {
              ocrJobId = cleanDbLabel(
                dispatch?.response?.jobId || dispatch?.response?.id || `ocr-${docId}`
              );
              ocrProvider = cleanDbLabel(
                dispatch?.response?.provider || externalOcrConfig.provider || "external_ocr"
              );
              ocrRequestedAt = new Date().toISOString();
              ocrCompletedAt = null;
              ocrError = "";

              await upsertDocumentRow(pool, {
                docId,
                caseId,
                name,
                mimeType,
                sizeBytes: finalSizeBytes,
                docType,
                blobUrl: blob?.url || "",
                extractedText,
                extractionMethod,
                ocrStatus,
                ocrJobId,
                ocrProvider,
                ocrRequestedAt,
                ocrCompletedAt,
                ocrError,
              });

              logIngestDiagnostic({
                event: "external_ocr_queued",
                doc_id: docId,
                case_id: caseId,
                file: name,
                ocr_job_id: ocrJobId,
                ocr_provider: ocrProvider,
                callback_url: externalOcrConfig.callbackUrl,
              });
            }
          } catch (dispatchErr) {
            ocrStatus = "failed_external";
            ocrError = cleanDbText(dispatchErr?.message || "External OCR dispatch failed");

            await updateExternalDispatchFailure(pool, {
              docId,
              errorMessage: ocrError,
            });

            logIngestDiagnostic({
              event: "external_ocr_dispatch_failed",
              doc_id: docId,
              case_id: caseId,
              file: name,
              error: ocrError,
            });
          }
        }

        uploaded.push(
          buildUploadedResponseRow({
            docId,
            caseId,
            name,
            mimeType,
            sizeBytes: finalSizeBytes,
            blobUrl: blob?.url || "",
            uploadedAt,
            docType,
            extractedText,
            extractionMethod,
            ocrStatus,
            ocrJobId,
            ocrProvider,
            ocrRequestedAt,
            ocrCompletedAt,
            ocrError,
            chunkCount,
            note: buildExtractionNote(extracted, name, mimeType, ocrStatus, ocrError),
          })
        );

        logIngestDiagnostic({
          event: "upload_success",
          doc_id: docId,
          case_id: caseId,
          file: name,
          mime_type: mimeType,
          bytes: finalSizeBytes,
          extraction_ok: !!extracted?.ok,
          extraction_method: extractionMethod || extracted?.method || "",
          ocr_status: ocrStatus,
          stored_text_length: extractedText.length,
          chunk_count: chunkCount,
        });
      } catch (err) {
        failed.push({
          name,
          error: String(err?.message || err),
        });

        logIngestDiagnostic({
          event: "upload_failed",
          case_id: caseId,
          file: name,
          mime_type: mimeType,
          error: String(err?.message || err),
        });
      }
    }

    const ok = failed.length === 0;
    const status = failed.length > 0 && uploaded.length > 0 ? 207 : ok ? 200 : 500;

    return json(
      {
        ok,
        caseId,
        uploaded,
        failed,
      },
      status,
      ownerTokenToSet
    );
  } catch (err) {
    return json(
      {
        ok: false,
        error: String(err?.message || err),
        uploaded,
        failed,
      },
      500,
      ownerTokenToSet
    );
  }
}
