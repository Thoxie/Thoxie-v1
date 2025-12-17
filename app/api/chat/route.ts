// app/api/chat/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const userMessage =
    body?.message && typeof body.message === "string"
      ? body.message
      : "";

  const reply =
    userMessage.trim().length === 0
      ? "Tell me what you’re preparing (first filing, hearing, or declaration) and which California county you’re in."
      : "Got it. I’m tracking this for your case. Next, tell me (1) your county, (2) whether you have a hearing date, and (3) what outcome you want in the next 30 days.";

  return NextResponse.json({ reply });
}

