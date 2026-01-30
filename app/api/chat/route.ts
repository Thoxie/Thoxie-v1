// PATH: app/api/chat/route.ts

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { enforceGuardrails } from "@/lib/guardrails";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type HistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Body = {
  message?: string;
  history?: HistoryItem[];
};

function normalizeGuardrailsResult(
  res: any,
): { allowed: boolean; reason?: string; systemPreamble?: string } {
  // If guardrails returns void (old signature), treat as allowed.
  if (res === undefined || res === null) return { allowed: true };

  // If guardrails returns a boolean (rare), normalize.
  if (typeof res === "boolean") return { allowed: res };

  // If guardrails returns an object (preferred), use it.
  if (typeof res === "object") {
    return {
      allowed: res.allowed !== false,
      reason: typeof res.reason === "string" ? res.reason : undefined,
      systemPreamble:
        typeof res.systemPreamble === "string" ? res.systemPreamble : undefined,
    };
  }

  return { allowed: true };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const message = (body.message ?? "").toString().trim();
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const guardrailsRaw = (enforceGuardrails as any)({ message, caseType: "family" });
    const { allowed, reason, systemPreamble } = normalizeGuardrailsResult(
      guardrailsRaw,
    );

    if (!allowed) {
      return NextResponse.json(
        {
          reply: `LIVE-AI: ${reason ?? "Request blocked by guardrails."}`,
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    const history = Array.isArray(body.history) ? body.history : [];
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          systemPreamble ??
          "You are THOXIE (Family Law). Provide neutral, structured decision-support guidance. Do not provide legal representation.",
      },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ?? "(no response)";

    return NextResponse.json({
      reply: reply.startsWith("LIVE-AI:") ? reply : `LIVE-AI: ${reply}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        reply: `LIVE-AI: Server error: ${err?.message ?? String(err)}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}



