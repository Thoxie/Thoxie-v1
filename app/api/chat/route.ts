// app/api/chat/route.ts

import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: string;
  context?: Record<string, unknown>;
};

export async function POST(req: Request) {
  let body: ChatRequestBody = {};
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const message = (body.message ?? "").toString().trim();
  if (!message) {
    return NextResponse.json(
      { error: "Missing 'message'." },
      { status: 400 },
    );
  }

  // Placeholder endpoint for local development / restore baseline.
  // This intentionally does not call external APIs in this restore target.
  return NextResponse.json({
    role: "assistant",
    content:
      "Chat endpoint is in restore-baseline mode. Provide the next implementation step or file to modify.",
  });
}

