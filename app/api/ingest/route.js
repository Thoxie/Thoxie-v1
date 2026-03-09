/* 3. PATH: app/api/ingest/route.js */
/* 3. FILE: route.js */
/* 3. ACTION: OVERWRITE */

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
import { extractTextFromPayload } from "../../_lib/rag/extractText";
import { chunkText } from "../../_lib/rag/chunkText";
import { upsertDocumentChunks } from "../../_lib/rag/memoryIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function normalizeBase64(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  const idx = s.indexOf("base64,");
  if (idx >= 0) return s.slice(idx + "base64,".length);
  return s;
}

function stripNullBytes(value) {
  return String(value || "").replace(/\u0000/g, "");
}

function cleanDbText(value) {
  return stripNullBytes(value).replace(/\r\n/g, "\n").trim();
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

    const pool = getPool();
    await ensureSchema(pool);
    await ensureCase(pool, caseId);

    const uploaded = [];
    const failed = [];

    for (const doc of documents) {
      try {
        const docId = safeUuid();
        const name = cleanDbText(doc?.name || "") || "(unnamed)";
        const mimeType = cleanDbText(doc?.mimeType || "") || "application/octet-stream";
        const sizeBytes = Number(doc?.size || 0);
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

        const buffer = Buffer.from(base64, "base64");

        const blob = await put(
          buildBlobPath(caseId, docId, name),
          buffer,
          getBlobPutOptions(mimeType)
        );

        const extracted = await extractTextFromPayload({
          mimeType,
          name,
          base64,
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
          [
            docId,
            caseId,
            name,
            mimeType,
            sizeBytes || buffer.byteLength,
            docType,
            blob.url,
            extractedText,
          ]
        );

        if (extractedText) {
          const chunks = chunkText(extractedText);
          upsertDocumentChunks({
            caseId,
            docId,
            name,
            mimeType,
            chunks,
          });
        }

        uploaded.push({
          ok: true,
          docId,
          name,
          blobUrl: blob.url,
          extraction: extracted?.ok
            ? { ok: true, method: extracted.method || "unknown" }
            : { ok: false, reason: extracted?.reason || "no_text" },
        });
      } catch (error) {
        failed.push({
          ok: false,
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
