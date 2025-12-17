// app/api/chat/route.ts
import { NextResponse } from "next/server";

/**
 * Chat API — Phase 1 (Stub)
 *
 * Purpose:
 * - Proves frontend ↔ backend wiring
 * - Provides deterministic responses
 * - Allows seamless swap to OpenAI later
 *
 * This endpoint intentionally does NOT give legal advice.
 */
export async function POST(req: Request) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const userMessage =
    body?.message && typeof body.message === "string"
      ? body.message.trim()
      : "";

  let reply = "";

  if (!userMessage) {
    reply =
      "Tell me what you’re preparing right now (first divorce filing, hearing prep, or declaration drafting) and which California county you’re in.";
  } else {
    reply =
      "Got it. I’m tracking this for your case. Next, tell me:\n" +
      "1) Your California county\n" +
      "2) Whether you have a hearing scheduled (and the date if yes)\n" +
      "3) What outcome you want to achieve in the next 30 days\n\n" +
      "I’ll use that to structure your preparation.";
  }

  return NextResponse.json({
    reply,
    timestamp: new Date().toISOString(),
  });
}
