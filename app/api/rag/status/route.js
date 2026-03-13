/* PATH: app/api/rag/status/route.js */
/* FILE: route.js */
/* ACTION: FULL OVERWRITE */

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = String(body?.caseId || "").trim();

    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: "Missing caseId" },
        { status: 400 }
      );
    }

    const pool = getPool();
    await ensureSchema(pool);

    const docsResult = await pool.query(
      `
      select
        d.doc_id,
        d.name,
        d.mime_type,
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

    const docs = docsResult.rows.map((row) => {
      const textLength = toNumber(row.text_length);
      const chunkCount = toNumber(row.chunk_count);

      return {
        docId: row.doc_id,
        name: row.name || "",
        mimeType: row.mime_type || "",
        uploadedAt: row.uploaded_at || "",
        textLength,
        chunkCount,
        readableByAI: textLength > 0 && chunkCount > 0,
      };
    });

    return NextResponse.json({
      ok: true,
      caseId,
      summary: {
        documentCount: docs.length,
        readableByAICount: docs.filter((d) => d.readableByAI).length,
        totalChunkCount: docs.reduce((sum, d) => sum + toNumber(d.chunkCount), 0),
      },
      docs,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
