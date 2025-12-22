// PATH: app/api/chat/route.ts
/**
 * THOXIE Chat API (OpenAI-backed)
 *
 * - Server-side only (API key never goes to the browser)
 * - Accepts optional conversation history for a real back-and-forth discussion
 * - Returns: { reply: string, timestamp: string }
 *
 * Note: THOXIE is a decision-support tool, not a law firm.
 */

import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type HistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatBody = {
  message?: string;
  context?: Record<string, any>;
  history?: HistoryItem[];
};

function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          reply:
            "Server misconfiguration: OPENAI_API_KEY is missing. Add it to .env.local (local) and Vercel Environment Variables (production).",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    let body: ChatBody = {};
    try {
      body = (await req.json()) as ChatBody;
    } catch {
      body = {};
    }

    const message = safeString(body.message).trim();
    const context =
      body?.context && typeof body.context === "object" ? body.context : {};
    const historyRaw = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({
        reply:
          "Ask me your legal question and include your California county and what you’re trying to accomplish. I’ll ask follow-ups and we’ll work it through step-by-step.",
        timestamp: new Date().toISOString(),
      });
    }

    // Keep history bounded.
    const history = historyRaw
      .filter(
        (h) =>
          h &&
          (h.role === "user" || h.role === "assistant" || h.role === "system") &&
          typeof h.content === "string" &&
          h.content.trim().length > 0
      )
      .slice(-16);

    const model = (process.env.OPENAI_MODEL || "gpt-5").trim();

    const instructions =
      "You are THOXIE, a legal decision-support assistant for California family law. " +
      "You are not a law firm and you do not provide legal advice. " +
      "You help users understand options, prep filings, organize evidence, and plan next steps. " +
      "Be direct, practical, and collaborative. Ask clarifying questions when needed. " +
      "Do NOT refuse to help just because the topic is legal—provide preparation guidance and strategy options. " +
      "If a user asks for something that requires a licensed attorney, say so and provide safer alternatives.";

    // Role-based input arrays preserve conversation state.
    // (Supported by the OpenAI Responses API.)
    const input: HistoryItem[] = [
      {
        role: "system",
        content:
          "Context (JSON): " +
          JSON.stringify(
            {
              ...context,
              policy:
                "Decision-support only; no legal advice; California family law focus.",
            },
            null,
            2
          ),
      },
      ...history,
      { role: "user", content: message },
    ];

    const resp = await client.responses.create({
      model,
      instructions,
      input,
    });

    const reply = (resp.output_text || "").trim();

    return NextResponse.json({
      reply:
        reply ||
        "I didn’t generate a response. Try rephrasing your question and include the county + what outcome you want.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        reply: `Chat error: ${err?.message ?? "Unknown error"}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
