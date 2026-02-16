// Path: /app/api/docs/ingest/route.js
import { NextResponse } from "next/server";

import { createDocId, putDoc } from "../../../_lib/docs/docStore";
import { chunkText, makeChunkId } from "../../../_lib/docs/chunker";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();

    const caseId = String(body?.caseId || "").trim();
    const title = String(body?.title || "").trim() || "Untitled document";
    const contentText = String(body?.contentText || "").trim();

    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: "Missing caseId." },
        { status: 400 }
      );
    }

    if (!contentText) {
      return NextResponse.json(
        { ok: false, error: "Missing contentText (text-only ingestion in v1)." },
        { status: 400 }
      );
    }

    const docId = createDocId();
    const createdAt = Date.now();

    const rawChunks = chunkText(contentText, { maxChars: 1200, overlap: 200 });
    const chunks = rawChunks.map((c) => ({
      id: makeChunkId(docId, c.index),
      docId,
      index: c.index,
      startChar: c.startChar,
      endChar: c.endChar,
      text: c.text,
    }));

    const doc = {
      id: docId,
      caseId,
      title,
      source: {
        kind: String(body?.sourceKind || "manual_text"),
        url: String(body?.sourceUrl || "").trim(),
      },
      createdAt,
      lengthChars: contentText.length,
      chunks,
    };

    putDoc(doc);

    return NextResponse.json({
      ok: true,
      docId,
      chunkCount: chunks.length,
      createdAt,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Failed to ingest document.", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

