// FILE: app/api/ingest/route.js
//
// Purpose (Phase 1/DB step):
// - Extract text when possible (DOCX/text payloads)
// - Persist document metadata + extracted text to Postgres (thoxie_document)
// - Persist raw file to Vercel Blob when base64 is provided
//
// Notes:
// - PDF extraction + OCR are still not implemented here; PDFs/images can still be stored (blob_url) with extracted_text empty.
// - Keeps existing in-memory RAG indexing for now (memoryIndex) to avoid breaking current UI/testing flows.

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { getPool } from "@/app/_lib/server/db";

import { RAG_LIMITS } from "../../_lib/rag/limits";
import { extractTextFromPayload } from "../../_lib/rag/extractText";
import { chunkText } from "../../_lib/rag/chunkText";
import { upsertDocumentChunks, listCaseDocs } from "../../_lib/rag/memoryIndex";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function approxBase64Bytes(b64) {
  const s = String(b64 || "");
  if (!s) return 0;
  const len = s.length;
  const padding = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

function normalizeBase64(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  // Accept both raw base64 and data URLs.
  const idx = s.indexOf("base64,");
  if (idx >= 0) return s.slice(idx + "base64,".length);
  return s;
}

function safeUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildNoTextNote({ reason, mimeType, name }) {
  const mt = String(mimeType || "").toLowerCase();
  const filename = String(name || "").toLowerCase();

  if (reason === "too_large") {
    return "File too large to sync in Phase-1. Try a smaller file or split it into parts.";
  }

  if (reason === "unsupported_mime") {
    if (mt.includes("pdf") || filename.endsWith(".pdf")) {
      return "PDF text extraction is not enabled yet in Phase-1. We can still store the PDF for later extraction.";
    }
    if (mt.includes("image") || /\.(png|jpg|jpeg|webp|heic)$/.test(filename)) {
      return "Image OCR is not enabled yet in Phase-1. We can still store the image for later extraction.";
    }
    return "This file type is not supported for text extraction yet.";
  }

  if (reason === "empty") {
    return "No readable text was found in this file (it may be scanned, image-based, or empty).";
  }

  if (reason === "parse_error" || reason === "decode_error") {
    return "THOXIE could not read this file reliably. Try re-saving the document and syncing again.";
  }

  if (reason === "no_content") {
    return "No file content was received for this document.";
  }

  return "No indexable text available in Phase-1 for this file type.";
}

async function ensureCase(pool, caseId) {
  await pool.query(
    `insert into thoxie_case(case_id) values ($1)
     on conflict (case_id) do nothing`,
    [caseId]
  );
}

async function upsertDocRow(pool, row) {
  const {
    docId,
    caseId,
    name,
    mimeType,
    sizeBytes,
    docType,
    exhibitDescription,
    blobUrl,
    extractedText,
  } = row;

  await pool.query(
    `insert into thoxie_document
      (doc_id, case_id, name, mime_type, size_bytes, doc_type, exhibit_description, blob_url, extracted_text)
     values
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (doc_id) do update set
      case_id = excluded.case_id,
      name = excluded.name,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      doc_type = excluded.doc_type,
      exhibit_description = excluded.exhibit_description,
      blob_url = excluded.blob_url,
      extracted_text = excluded.extracted_text`,
    [
      docId,
      caseId,
      name,
      mimeType || null,
      Number.isFinite(sizeBytes) ? sizeBytes : null,
      docType || null,
      exhibitDescription || null,
      blobUrl || null,
      extractedText || "",
    ]
  );
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const caseId = String(body.caseId || "").trim() || "no-case";
    const docs = Array.isArray(body.documents) ? body.documents : [];

    if (docs.length === 0) return json({ ok: false, error: "No documents provided" }, 400);
    if (docs.length > RAG_LIMITS.maxDocsPerIngest) {
      return json({ ok: false, error: `Too many documents (max ${RAG_LIMITS.maxDocsPerIngest})` }, 400);
    }

    // Keep Phase-1 payload cap
    const MAX_TOTAL_BASE64_BYTES = 3_000_000;
    let totalBase64Bytes = 0;
    for (const d of docs) {
      if (typeof d?.base64 === "string" && d.base64.trim()) {
        totalBase64Bytes += approxBase64Bytes(d.base64);
      }
    }
    if (totalBase64Bytes > MAX_TOTAL_BASE64_BYTES) {
      return json(
        { ok: false, error: `Request too large for Phase-1 sync (max ${MAX_TOTAL_BASE64_BYTES} bytes total).` },
        413
      );
    }

    const pool = getPool();
    await ensureCase(pool, caseId);

    const results = [];

    for (const d of docs) {
      const incomingId = String(d.docId || d.id || "").trim();
      const docId = incomingId || safeUuid();

      const name = String(d.name || d.filename || "").trim() || "(unnamed)";
      const mimeType = String(d.mimeType || d.kind || "").trim();
      const sizeBytes = Number(d.size || d.sizeBytes || NaN);
      const docType = String(d.docType || "").trim() || null;
      const exhibitDescription = String(d.exhibitDescription || d.exhibit_description || "").trim() || null;

      // 1) Extract text if possible (DOCX/text payloads)
      const ex = await extractTextFromPayload({
        mimeType,
        name,
        text: d.text,
        base64: d.base64,
      });

      const extractedText = ex.ok ? String(ex.text || "") : "";

      // 2) Store file in Vercel Blob if we have base64
      let blobUrl = null;
      const b64 = normalizeBase64(d.base64);
      if (b64) {
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (!token) {
          return json({ ok: false, error: "Missing BLOB_READ_WRITE_TOKEN in environment" }, 500);
        }

        const buf = Buffer.from(b64, "base64");
        const extGuess =
          name.toLowerCase().endsWith(".pdf")
            ? "pdf"
            : name.toLowerCase().endsWith(".docx")
              ? "docx"
              : name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)?.[1] || "bin";

        const blobName = `cases/${caseId}/docs/${docId}.${extGuess}`;

        const putRes = await put(blobName, buf, {
          access: "private",
          contentType: mimeType || "application/octet-stream",
          token,
          addRandomSuffix: false,
        });

        blobUrl = putRes?.url || null;
      }

      // 3) Persist metadata + extracted text to Postgres
      await upsertDocRow(pool, {
        docId,
        caseId,
        name,
        mimeType,
        sizeBytes,
        docType,
        exhibitDescription,
        blobUrl,
        extractedText,
      });

      // 4) Keep existing in-memory indexing (temporary, until AI retrieval is moved to DB)
      if (!ex.ok || !extractedText.trim()) {
        results.push({
          docId,
          name,
          ok: false,
          persisted: true,
          blobUrl,
          method: ex.method,
          chunksCount: 0,
          note: buildNoTextNote({ reason: ex.reason, mimeType, name }),
        });
        continue;
      }

      const chunks = chunkText(extractedText);
      const MAX_CHUNKS_PER_DOC = 240;
      const cappedChunks = chunks.slice(0, MAX_CHUNKS_PER_DOC);

      const up = upsertDocumentChunks({ caseId, docId, name, mimeType, chunks: cappedChunks });

      results.push({
        docId: up.docId,
        name,
        ok: true,
        persisted: true,
        blobUrl,
        method: ex.method,
        chunksCount: up.chunksCount,
        extractedTextLen: extractedText.length,
        note: chunks.length > cappedChunks.length ? `Chunk cap applied (${MAX_CHUNKS_PER_DOC}).` : undefined,
      });
    }

    return json({
      ok: true,
      caseId,
      indexed: results,
      caseDocs: listCaseDocs(caseId),
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
