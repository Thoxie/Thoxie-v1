
/* FILE: app/api/ingest/route.js */
/* FULL OVERWRITE */

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getPool } from "@/app/_lib/server/db";
import { RAG_LIMITS } from "../../_lib/rag/limits";
import { extractTextFromPayload } from "../../_lib/rag/extractText";
import { chunkText } from "../../_lib/rag/chunkText";
import memoryIndex from "../../_lib/rag/memoryIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function safeUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function GET() {
  return json({
    ok: true,
    route: "/api/ingest",
    status: "ready"
  });
}

export async function POST(req) {

  try {

    const body = await req.json();

    const caseId = String(body.caseId || "").trim();
    const docs = Array.isArray(body.documents) ? body.documents : [];

    if (!caseId) {
      return json({ ok:false, error:"missing caseId" },400);
    }

    if (!docs.length) {
      return json({ ok:false, error:"no documents" },400);
    }

    const pool = getPool();

    await pool.query(
      `insert into thoxie_case(case_id)
       values ($1)
       on conflict (case_id) do nothing`,
      [caseId]
    );

    const results = [];

    for (const d of docs) {

      const docId = safeUuid();

      const name = d.name || "(unnamed)";
      const mimeType = d.mimeType || null;
      const base64 = d.base64 || "";

      let blobUrl = null;

      if (base64) {

        const buf = Buffer.from(base64, "base64");

        const blob = await put(
          `cases/${caseId}/${docId}`,
          buf,
          {
            access:"private",
            token:process.env.BLOB_READ_WRITE_TOKEN
          }
        );

        blobUrl = blob.url;
      }

      const ex = await extractTextFromPayload({
        mimeType,
        name,
        base64
      });

      const extractedText = ex?.text || "";

      await pool.query(
        `insert into thoxie_document
        (doc_id,case_id,name,mime_type,blob_url,extracted_text)
        values ($1,$2,$3,$4,$5,$6)
        on conflict (doc_id) do update
        set extracted_text=excluded.extracted_text`,
        [
          docId,
          caseId,
          name,
          mimeType,
          blobUrl,
          extractedText
        ]
      );

      if (extractedText) {

        const chunks = chunkText(extractedText);

        memoryIndex.upsertDocumentChunks({
          caseId,
          docId,
          name,
          mimeType,
          chunks
        });
      }

      results.push({
        docId,
        name,
        ok:true,
        blobUrl
      });
    }

    return json({
      ok:true,
      caseId,
      indexed:results
    });

  }
  catch(err){

    return json(
      {
        ok:false,
        error:String(err.message || err)
      },
      500
    );
  }
}
