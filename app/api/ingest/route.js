// PATH: /app/api/ingest/route.js
// DIRECTORY: /app/api/ingest
// FILE: route.js
// ACTION: FULL OVERWRITE

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
  const method = String(extracted?.method || "").trim();
  const pdfLike = isPdfLike(mimeType, name);

  if (reason === "ocr_deferred_large_image") {
    return "deferred_large_image";
  }

  const isPdfOcrRetryableFailure =
    pdfLike &&
    method === "ocr" &&
    (reason === "timeout" ||
      reason === "empty_pdf_ocr" ||
      reason.startsWith("parse_error:") ||
      reason.startsWith("missing_parser:"));

  if (isPdfOcrRetryableFailure) {
    return externalOcrEnabled ? "queued_external" : "needed_scanned_pdf";
  }

  if (reason === "timeout") {
    return "failed_timeout";
  }

  if (pdfLike && reason === "empty_pdf_text_layer") {
    return externalOcrEnabled ? "queued_external" : "needed_scanned_pdf";
  }

  if (isImageLike(mimeType, name)) {
    return "needed_image_ocr";
  }

  if (reason.startsWith("parse_error:")) {
    return "failed_parse";
  }

  if (reason.startsWith("missing_parser:")) {
    return "failed_parser";
  }

  return "not_applicable";
}

function buildExtractionNote(extracted, name, mimeType, ocrStatus) {
  const reason = String(extracted?.reason || "").trim();
  const ext = fileExtension(name);
  const imageLike = isImageLike(mimeType, name);
  const pdfLike = isPdfLike(mimeType, name);

  if (ocrStatus === "queued_external") {
    return "Scanned PDF detected. An external OCR job was queued. The file is stored now; searchable text will appear after OCR processing completes.";
  }

  if (!reason) return "";

  if (reason === "unsupported_legacy_word_doc") {
    return "Legacy .doc files are not supported in beta. Save the file as .docx and re-upload it.";
  }

  if (reason === "empty_pdf_text_layer" && pdfLike) {
    return "The PDF was saved, but no machine-readable text layer was found. This is likely a scanned PDF. The file is stored, but searchable text was not created yet.";
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
  const rawChunks = chunkText(extractedText || "", { returnObjects: true });
  const chunks = normalizeChunkRecords(rawChunks);

  logIngestDiagnostic({
    event: "chunk_persist_start",
    doc_id: docId,
    file: name || "(unnamed)",
    text_length: String(extractedText || "").length,
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
