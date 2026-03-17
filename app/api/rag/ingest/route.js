/* PATH: app/api/rag/ingest/route.js */
/* FILE: route.js */
/* ACTION: FULL OVERWRITE */

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
import { extractTextFromBuffer } from "@/app/_lib/documents/extractText";
import { chunkText } from "@/app/_lib/rag/chunkText";
import { RAG_LIMITS } from "@/app/_lib/rag/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function safeStr(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function safeArray(value) {
  return Array.isArray(value)
    ? value.map((item) => safeStr(item)).filter(Boolean)
    : [];
}

function normalizeBase64(input) {
  const raw = safeStr(input);
  if (!raw) return "";
  const withoutPrefix = raw.includes("base64,") ? raw.slice(raw.indexOf("base64,") + 7) : raw;
  return withoutPrefix.replace(/\s+/g, "");
}

function decodeBase64ToBuffer(input) {
  const normalized = normalizeBase64(input);
  if (!normalized) return null;
  try {
    return Buffer.from(normalized, "base64");
  } catch {
    return null;
  }
}

function inferMimeType(name, rawMimeType) {
  const declared = safeStr(rawMimeType).toLowerCase();
  if (declared) return declared;

  const lower = safeStr(name).toLowerCase();
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function cleanDbText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function cleanDbLabel(value) {
  return cleanDbText(value).replace(/\s+/g, " ").trim();
}

function cleanFlagArray(value) {
  return safeArray(value).map((item) => cleanDbLabel(item)).filter(Boolean).slice(0, 24);
}

function safeUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function approxBase64Bytes(b64) {
  const s = normalizeBase64(b64);
  if (!s) return 0;
  const len = s.length;
  const padding = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
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

async function upsertDocumentRow(client, values) {
  const {
    docId,
    caseId,
    name,
    mimeType,
    sizeBytes,
    docType,
    exhibitDescription,
    evidenceCategory,
    evidenceSupports,
    extractedText,
    extractionMethod,
    ocrStatus,
    ocrError,
  } = values;

  await client.query(
    `
    insert into thoxie_document (
      doc_id,
      case_id,
      name,
      mime_type,
      size_bytes,
      doc_type,
      exhibit_description,
      evidence_category,
      evidence_supports,
      extracted_text,
      extraction_method,
      ocr_status,
      ocr_error,
      uploaded_at
    )
    values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,now()
    )
    on conflict (doc_id) do update set
      case_id = excluded.case_id,
      name = excluded.name,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      doc_type = excluded.doc_type,
      exhibit_description = excluded.exhibit_description,
      evidence_category = excluded.evidence_category,
      evidence_supports = excluded.evidence_supports,
      extracted_text = excluded.extracted_text,
      extraction_method = excluded.extraction_method,
      ocr_status = excluded.ocr_status,
      ocr_error = excluded.ocr_error,
      uploaded_at = now()
    `,
    [
      docId,
      caseId,
      name,
      mimeType,
      Number(sizeBytes || 0),
      docType,
      exhibitDescription,
      evidenceCategory,
      JSON.stringify(evidenceSupports || []),
      extractedText,
      extractionMethod,
      ocrStatus,
      ocrError,
    ]
  );
}

async function replaceDocumentChunks(client, values) {
  const { caseId, docId, chunks } = values;

  await client.query(`delete from thoxie_document_chunk where doc_id = $1`, [docId]);

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i] || {};
    const chunkId = `${docId}::${i}`;

    await client.query(
      `
      insert into thoxie_document_chunk (
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
      values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb
      )
      `,
      [
        chunkId,
        caseId,
        docId,
        i,
        cleanDbText(chunk.text || ""),
        cleanDbLabel(chunk.chunkKind || ""),
        cleanDbLabel(chunk.label || ""),
        cleanDbLabel(chunk.sectionLabel || ""),
        Number.isFinite(Number(chunk.pageStart)) ? Number(chunk.pageStart) : null,
        Number.isFinite(Number(chunk.pageEnd)) ? Number(chunk.pageEnd) : null,
        Number.isFinite(Number(chunk.charStart)) ? Number(chunk.charStart) : null,
        Number.isFinite(Number(chunk.charEnd)) ? Number(chunk.charEnd) : null,
        JSON.stringify(cleanFlagArray(chunk.structuralFlags)),
      ]
    );
  }
}

function buildNoTextNote({ reason }) {
  const r = safeStr(reason);

  if (!r) return "No searchable text was produced.";
  if (r === "too_large") return "File too large for current sync limits.";
  if (r === "unsupported_legacy_word_doc") return "Legacy .doc files are not supported in beta.";
  if (r === "empty_pdf_text_layer") return "The PDF appears scanned or lacks a readable text layer.";
  if (r === "unsupported_mime") return "This file type is not supported for extraction yet.";
  if (r === "empty") return "No readable text was extracted from this document.";
  if (r === "no_content") return "No file content was received for this document.";
  if (r.startsWith("parse_error:")) return `Extraction failed: ${r.slice("parse_error:".length)}`;
  if (r.startsWith("missing_parser:")) return `Parser startup failed: ${r.slice("missing_parser:".length)}`;
  return r;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const caseId = safeStr(body.caseId) || "no-case";
    const docs = Array.isArray(body.documents) ? body.documents : [];

    if (docs.length === 0) {
      return json({ ok: false, error: "No documents provided" }, 400);
    }

    if (docs.length > Number(RAG_LIMITS?.maxDocsPerIngest || 25)) {
      return json(
        { ok: false, error: `Too many documents (max ${Number(RAG_LIMITS?.maxDocsPerIngest || 25)})` },
        400
      );
    }

    const MAX_TOTAL_BASE64_BYTES = 3_000_000;
    let totalBase64Bytes = 0;
    for (const doc of docs) {
      if (safeStr(doc?.base64)) totalBase64Bytes += approxBase64Bytes(doc.base64);
    }

    if (totalBase64Bytes > MAX_TOTAL_BASE64_BYTES) {
      return json(
        { ok: false, error: `Request too large for sync (max ${MAX_TOTAL_BASE64_BYTES} bytes total).` },
        413
      );
    }

    const pool = getPool();
    await ensureSchema(pool);
    await ensureCase(pool, caseId);

    const results = [];

    for (const d of docs) {
      const docId = safeStr(d?.docId || d?.id) || safeUuid();
      const name = safeStr(d?.name || d?.filename) || "(unnamed)";
      const mimeType = inferMimeType(name, d?.mimeType || d?.kind || "");
      const sizeBytes = Number(d?.size || 0) || 0;
      const docType = safeStr(d?.docType || d?.kind || "evidence") || "evidence";
      const exhibitDescription = safeStr(d?.exhibitDescription || "");
      const evidenceCategory = safeStr(d?.evidenceCategory || "");
      const evidenceSupports = safeArray(d?.evidenceSupports);
      const clientText = cleanDbText(d?.text || "");
      const buffer = decodeBase64ToBuffer(d?.base64 || "");

      let extracted = null;
      if (buffer) {
        extracted = await extractTextFromBuffer({
          buffer,
          mimeType,
          filename: name,
          maxChars: 180_000,
        });
      } else if (clientText) {
        extracted = {
          ok: true,
          method: safeStr(d?.extractionMethod) || "client_text",
          text: clientText,
        };
      } else {
        extracted = { ok: false, method: "none", text: "", reason: "no_content" };
      }

      const finalText = cleanDbText(extracted?.ok ? extracted.text : clientText);
      const extractionMethod = safeStr(extracted?.method || d?.extractionMethod || "");
      const ocrStatus = safeStr(
        d?.ocrStatus || (extractionMethod === "ocr" ? "completed" : extracted?.ok ? "not_needed" : "not_available")
      );
      const ocrError = extracted?.ok ? "" : safeStr(extracted?.reason || "");

      if (!finalText) {
        const client = await pool.connect();
        try {
          await client.query("begin");
          await upsertDocumentRow(client, {
            docId,
            caseId,
            name,
            mimeType,
            sizeBytes,
            docType,
            exhibitDescription,
            evidenceCategory,
            evidenceSupports,
            extractedText: "",
            extractionMethod,
            ocrStatus,
            ocrError,
          });
          await client.query(`delete from thoxie_document_chunk where doc_id = $1`, [docId]);
          await client.query("commit");
        } catch (error) {
          await client.query("rollback").catch(() => {});
          throw error;
        } finally {
          client.release();
        }

        results.push({
          docId,
          name,
          ok: false,
          method: extractionMethod || "none",
          chunksCount: 0,
          note: buildNoTextNote({ reason: extracted?.reason || "empty" }),
        });
        continue;
      }

      const chunkObjects = chunkText(finalText, { returnObjects: true });
      const MAX_CHUNKS_PER_DOC = 240;
      const cappedChunks = chunkObjects.slice(0, MAX_CHUNKS_PER_DOC);

      const client = await pool.connect();
      try {
        await client.query("begin");
        await upsertDocumentRow(client, {
          docId,
          caseId,
          name,
          mimeType,
          sizeBytes,
          docType,
          exhibitDescription,
          evidenceCategory,
          evidenceSupports,
          extractedText: finalText,
          extractionMethod,
          ocrStatus,
          ocrError,
        });
        await replaceDocumentChunks(client, {
          caseId,
          docId,
          chunks: cappedChunks,
        });
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      } finally {
        client.release();
      }

      results.push({
        docId,
        name,
        ok: true,
        method: extractionMethod || "server_extract",
        chunksCount: cappedChunks.length,
        note: chunkObjects.length > cappedChunks.length ? `Chunk cap applied (${MAX_CHUNKS_PER_DOC}).` : undefined,
      });
    }

    const summaryResult = await pool.query(
      `
      select
        count(*)::int as document_count,
        coalesce(sum(length(coalesce(extracted_text, ''))), 0)::int as total_text_length,
        (
          select count(*)::int
          from thoxie_document_chunk
          where case_id = $1
        ) as chunk_count
      from thoxie_document
      where case_id = $1
      `,
      [caseId]
    );

    const summary = summaryResult.rows[0] || {};

    return json({
      ok: true,
      caseId,
      indexed: results,
      summary: {
        documentCount: Number(summary.document_count || 0),
        totalTextLength: Number(summary.total_text_length || 0),
        chunkCount: Number(summary.chunk_count || 0),
      },
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
