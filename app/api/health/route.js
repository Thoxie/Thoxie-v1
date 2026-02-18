// Path: /app/api/health/route.js
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "THOXIE",
    status: "healthy",
    ts: new Date().toISOString()
  });
}

