// FILE: app/api/documents/delete/route.js
// PURPOSE:
// Delete a document, its chunks, and the blob storage object.

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { del } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const docId = String(body?.docId || "").trim();

    if (!docId) {
      return json({ ok: false, error: "Missing docId" }, 400);
    }

    const pool = getPool();

    const docRes = await pool.query(
      `
      SELECT doc_id, blob_url
      FROM thoxie_document
      WHERE doc_id = $1
      `,
      [docId]
    );

    if (!docRes.rows.length) {
      return json({ ok: false, error: "Document not found" }, 404);
    }

    const doc = docRes.rows[0];

    await pool.query(
      `
      DELETE FROM thoxie_document_chunk
      WHERE doc_id = $1
      `,
      [docId]
    );

    await pool.query(
      `
      DELETE FROM thoxie_document
      WHERE doc_id = $1
      `,
      [docId]
    );

    if (doc.blob_url) {
      try {
        await del(doc.blob_url);
      } catch (err) {
        console.warn("Blob deletion warning:", err.message);
      }
    }

    return json({
      ok: true,
      deleted: docId,
    });
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
