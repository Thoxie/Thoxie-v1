/* FILE: app/api/ingest/route.js */
/* FULL OVERWRITE */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ingest",
    message: "THOXIE ingest endpoint is alive"
  });
}

export async function POST(req) {
  try {
    const body = await req.json();

    return NextResponse.json({
      ok: true,
      received: true,
      bodyPreview: body ? Object.keys(body) : []
    });

  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err.message
      },
      { status: 500 }
    );
  }
}
