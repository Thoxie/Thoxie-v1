// Path: /app/api/ai/chat/route.js
import { NextResponse } from "next/server";

/**
 * POST /api/ai/chat
 * Minimal build-safe placeholder endpoint.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/ai/chat",
    usedLiveModel: false,
    reply: {
      role: "assistant",
      content: "THOXIE AI endpoint is live (placeholder).",
    },
    ts: new Date().toISOString(),
  });
}

