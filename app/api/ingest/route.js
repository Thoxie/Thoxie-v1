/* PATH: app/api/ingest/route.js */
/* FILE: route.js */
/* ACTION: FULL OVERWRITE */

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
import { extractTextFromBuffer } from "../../_lib/documents/extractText";
import { chunkText } from "../../_lib/rag/chunkText";
import { RAG_LIMITS } from "../../_lib/rag/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OCR_INLINE_MAX_BYTES = 4_000_000;

function logIngestDiagnostic(payload = {}) {
  console.info(
    "UPLOAD_DIAGNOSTIC",
    JSON.stringify({
      scope: "ingest",
      ...payload,
    })
  );
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
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

function deriveOcrStatus({ extracted, mimeType, name }) {
  if (extracted?.ok) {
    return extracted?.method === "ocr" ? "completed" : "not_needed";
  }

  const reason = String(extracted?.reason || "").trim();

  if (reason === "ocr_deferred_large_image") {
    return "deferred_large_image";
  }

  if (reason === "timeout") {
    return "failed_timeout";
  }

  if (isPdfLike(mimeType, name) && reason === "empty_pdf_text_layer") {
    return "needed_scanned_pdf";
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

function buildExtractionNote(extracted, name, mimeType) {
  const reason = String(extracted?.reason || "").trim();
  const ext = fileExtension(name);
  const imageLike = isImageLike(mimeType, name);
  const pdfLike = isPdfLike(mimeType, name);

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

async function ensureCase(pool, caseId) {
  await pool.query(
    `
    insert into thoxie_case (case_id)
    values ($1)
    on conflict (case_id) do nothing
    `,
    [caseId]
  );
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
        uploaded_at
      )
    values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    on conflict (doc_id) do update set
      case_id = excluded.case_id,
      name = excluded.name,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      doc_type = excluded.doc_type,
      blob_url = excluded.blob_url,
      extracted_text = excluded.extracted_text,
      extraction_method = excluded.extraction_method,
      ocr_status = excluded.ocr_status
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
    ]
  );
}

async function persistChunks(poolOrClient, { caseId, docId, extractedText, name }) {
  const chunks = chunkText(extractedText || "");
  const cappedChunks = chunks.slice(0, 250);

  logIngestDiagnostic({
    event: "chunk_persist_start",
    doc_id: docId,
    file: name || "(unnamed)",
    text_length: String(extractedText || "").length,
    chunks_produced: chunks.length,
    chunks_capped: cappedChunks.length,
  });

  await poolOrClient.query(
    `
    delete from thoxie_document_chunk
    where doc_id = $1
    `,
    [docId]
  );

  let insertedCount = 0;

  for (let i = 0; i < cappedChunks.length; i += 1) {
    const chunk = cleanDbText(cappedChunks[i] || "");
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

  return extractTextFromBuffer({
    buffer,
    mimeType,
    filename: name,
    limits: {
      maxBytes: RAG_LIMITS.maxUploadBytesPerDoc,
      ocrTimeoutMs: 20_000,
    },
    maxChars: RAG_LIMITS.maxCharsPerDoc,
  });
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
  }));

  return { caseId, documents };
}

async function parseMultipartDocuments(req) {
  const form = await req.formData();
  const caseId = cleanDbText(form.get("caseId") || "");
  const defaultDocType = cleanDbText(form.get("docType") || "") || "evidence";
  const fileEntries = form.getAll("files").filter(Boolean);

  const documents = [];

  for (const entry of fileEntries) {
    if (!(entry instanceof File)) continue;

    const name = cleanDbText(entry.name || "") || "(unnamed)";
    const mimeType = inferMimeType(name, cleanDbText(entry.type || ""));
    const sizeBytes = Number(entry.size || 0);
    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    documents.push({
      source: "multipart",
      name,
      mimeType,
      sizeBytes,
      docType: defaultDocType,
      base64: "",
      buffer,
    });
  }

  return { caseId, documents };
}

async function parseIngestRequest(req) {
  const contentType = getRequestContentType(req);

  if (contentType.includes("multipart/form-data")) {
    return parseMultipartDocuments(req);
  }

  const body = await req.json();
  return parseJsonDocuments(body);
}

async function materializeBuffer(documentInput) {
  if (documentInput?.buffer instanceof Buffer) {
    return documentInput.buffer;
  }

  const base64 = normalizeBase64(documentInput?.base64 || "");
  if (!base64) {
    throw new Error("Missing base64 payload");
  }

  const approxBytes = Math.floor((base64.length * 3) / 4);

  if (approxBytes > RAG_LIMITS.maxBase64BytesPerDoc) {
    throw new Error(`File exceeds JSON/base64 upload payload limit (${RAG_LIMITS.maxBase64BytesPerDoc} bytes)`);
  }

  if (approxBytes > RAG_LIMITS.maxUploadBytesPerDoc) {
    throw new Error(`File exceeds upload size limit (${RAG_LIMITS.maxUploadBytesPerDoc} bytes)`);
  }

  return Buffer.from(base64, "base64");
}

async function processDocument(pool, caseId, documentInput) {
  const docId = safeUuid();
  const name = cleanDbText(documentInput?.name || "") || "(unnamed)";
  const mimeType = inferMimeType(name, cleanDbText(documentInput?.mimeType || ""));
  const docType = cleanDbText(documentInput?.docType || "") || "evidence";

  const buffer = await materializeBuffer(documentInput);
  const sizeBytes = Number(documentInput?.sizeBytes || 0) || buffer.byteLength;

  if (sizeBytes > RAG_LIMITS.maxUploadBytesPerDoc) {
    throw new Error(`File exceeds upload size limit (${RAG_LIMITS.maxUploadBytesPerDoc} bytes)`);
  }

  const blob = await put(
    buildBlobPath(caseId, docId, name),
    buffer,
    getBlobPutOptions(mimeType)
  );

  const extracted = await extractForIngest({
    mimeType,
    name,
    buffer,
    sizeBytes,
  });

  const extractedText = extracted?.ok ? cleanDbText(extracted.text || "") : "";
  const extractionMethod = String(extracted?.method || "none");
  const ocrStatus = deriveOcrStatus({ extracted, mimeType, name });

  logIngestDiagnostic({
    event: "extract_complete",
    doc_id: docId,
    case_id: caseId,
    file: name,
    mime: mimeType,
    source: documentInput?.source || "unknown",
    extraction_method: extractionMethod,
    extraction_ok: !!extracted?.ok,
    extracted_text_length: extractedText.length,
    extraction_reason: extracted?.reason || null,
    ocr_status: ocrStatus,
    size_bytes: sizeBytes,
  });

  const client = await pool.connect();
  let chunkCount = 0;
  let extractedWritten = false;

  try {
    await client.query("BEGIN");

    await upsertDocumentRow(client, {
      docId,
      caseId,
      name,
      mimeType,
      sizeBytes,
      docType,
      blobUrl: blob.url,
      extractedText,
      extractionMethod,
      ocrStatus,
    });
    extractedWritten = true;

    chunkCount = extractedText
      ? await persistChunks(client, { caseId, docId, extractedText, name })
      : 0;

    await client.query("COMMIT");

    logIngestDiagnostic({
      event: "persist_complete",
      doc_id: docId,
      case_id: caseId,
      file: name,
      mime: mimeType,
      source: documentInput?.source || "unknown",
      extraction_method: extractionMethod,
      extracted_text_length: extractedText.length,
      extracted_text_written: extractedWritten,
      chunks_created: chunkCount,
      ocr_status: ocrStatus,
      size_bytes: sizeBytes,
    });
  } catch (dbError) {
    await client.query("ROLLBACK");
    logIngestDiagnostic({
      event: "persist_failed",
      doc_id: docId,
      case_id: caseId,
      file: name,
      mime: mimeType,
      source: documentInput?.source || "unknown",
      extraction_method: extractionMethod,
      extracted_text_length: extractedText.length,
      extracted_text_written: extractedWritten,
      chunks_created: chunkCount,
      ocr_status: ocrStatus,
      size_bytes: sizeBytes,
      error: String(dbError?.message || dbError),
    });
    throw dbError;
  } finally {
    client.release();
  }

  const note = buildExtractionNote(extracted, name, mimeType);

  return {
    ok: true,
    docId,
    name,
    blobUrl: blob.url,
    uploadedAt: new Date().toISOString(),
    extraction: extracted?.ok
      ? {
          ok: true,
          method: extractionMethod,
          textLength: extractedText.length,
          note,
        }
      : {
          ok: false,
          method: extractionMethod,
          reason: extracted?.reason || "no_text",
          note,
          textLength: 0,
        },
    ocrStatus,
    chunkCount,
    storedTextLength: extractedText.length,
    readableByAI: extractedText.length > 0 && chunkCount > 0,
  };
}

export async function GET() {
  return json({
    ok: true,
    route: "/api/ingest",
    runtime,
    status: "ready",
  });
}

export async function POST(req) {
  try {
    const parsed = await parseIngestRequest(req);
    const caseId = cleanDbText(parsed?.caseId || "");
    const documents = Array.isArray(parsed?.documents) ? parsed.documents : [];

    if (!caseId) {
      return json({ ok: false, error: "Missing caseId" }, 400);
    }

    if (!documents.length) {
      return json({ ok: false, error: "No documents provided" }, 400);
    }

    if (documents.length > RAG_LIMITS.maxDocsPerIngest) {
      return json(
        {
          ok: false,
          error: `Too many documents in one request. Max allowed: ${RAG_LIMITS.maxDocsPerIngest}`,
        },
        400
      );
    }

    const pool = getPool();
    await ensureSchema(pool);
    await ensureCase(pool, caseId);

    const uploaded = [];
    const failed = [];

    for (const doc of documents) {
      try {
        const result = await processDocument(pool, caseId, doc);
        uploaded.push(result);
      } catch (error) {
        failed.push({
          ok: false,
          docId: safeUuid(),
          name: cleanDbText(doc?.name || "") || "(unnamed)",
          error: String(error?.message || error),
        });
      }
    }

    return json(
      {
        ok: failed.length === 0,
        caseId,
        uploaded,
        failed,
      },
      failed.length ? 207 : 200
    );
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
