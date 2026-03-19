/* FULL PATH: app/api/rag/ingest/route.js */
/* FILE NAME: route.js */
/* ACTION: OVERWRITE */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST() {
  return json(
    {
      ok: false,
      disabled: true,
      error:
        "Sync Docs is disabled. Use /api/ingest upload flow for canonical evidence ingestion (Blob + Postgres + chunks).",
    },
    410
  );
}
