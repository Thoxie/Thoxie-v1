/* 2. PATH: app/api/ingest/route.js */
/* 2. FILE: route.js */
/* 2. ACTION: OVERWRITE */

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
  const fn = String(name || "").toLowerCase();

  return (
    mt.startsWith("image/") ||
    fn.endsWith(".png") ||
    fn.endsWith(".jpg") ||
    fn.endsWith(".jpeg") ||
    fn.endsWith(".webp") ||
    fn.endsWith(".bmp") ||
    fn.endsWith(".gif") ||
    fn.endsWith(".tif") ||
    fn.endsWith(".tiff") ||
    fn.endsWith(".heic") ||
    fn.endsWith(".heif")
  );
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

async function persistChunks(pool, { caseId, docId, extractedText }) {
  const chunks = chunkText(extractedText || "");
  const cappedChunks = chunks.slice(0, 250);

  await pool.query(
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

    await pool.query(
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
      maxBytes: RAG_LIMITS.maxBase64BytesPerDoc,
      ocrTimeoutMs: 20_000,
    },
    maxChars: RAG_LIMITS.maxCharsPerDoc,
  });
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
    const body = await req.json();
    const caseId = cleanDbText(body?.caseId || "");
    const documents = Array.isArray(body?.documents) ? body.documents : [];

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
      const docId = safeUuid();

      try {
        const name = cleanDbText(doc?.name || "") || "(unnamed)";
        const mimeType = cleanDbText(doc?.mimeType || "") || "application/octet-stream";
        const declaredSize = Number(doc?.size || 0);
        const docType = cleanDbText(doc?.docType || "") || "evidence";
        const base64 = normalizeBase64(doc?.base64 || "");

        if (!base64) {
          failed.push({
            ok: false,
            docId,
            name,
            error: "Missing base64 payload",
          });
          continue;
        }

        const approxBytes = Math.floor((base64.length * 3) / 4);
        if (approxBytes > RAG_LIMITS.maxBase64BytesPerDoc) {
          failed.push({
            ok: false,
            docId,
            name,
            error: `File exceeds upload payload limit (${RAG_LIMITS.maxBase64BytesPerDoc} bytes)`,
          });
          continue;
        }

        const buffer = Buffer.from(base64, "base64");
        const sizeBytes = declaredSize || buffer.byteLength;

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
          [docId, caseId, name, mimeType, sizeBytes, docType, blob.url, extractedText]
        );

        const chunkCount = extractedText
          ? await persistChunks(pool, { caseId, docId, extractedText })
          : 0;

        uploaded.push({
          ok: true,
          docId,
          name,
          blobUrl: blob.url,
          extraction: extracted?.ok
            ? {
                ok: true,
                method: extracted.method || "unknown",
                textLength: extractedText.length,
              }
            : {
                ok: false,
                method: extracted?.method || "none",
                reason: extracted?.reason || "no_text",
              },
          chunkCount,
        });
      } catch (error) {
        failed.push({
          ok: false,
          docId,
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
