// PATH: app/api/chat/route.ts
/**
 * THOXIE Chat API (LIVE OpenAI)
 * Returns { reply, timestamp }
 * Reply always starts with "LIVE-AI:" so you can verify it’s not the stub.
 */

import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  DEFAULT_CASE_TYPE,
  isCaseTypeId,
  type CaseTypeId,
} from "@/lib/caseTypes";
import { getCaseTypeInstructions } from "@/lib/aiInstructions";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type HistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatBody = {
  message?: string;
  context?: Record<string, any>;
  history?: HistoryItem[];
};

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function getCaseTypeFromContext(context: Record<string, any>): CaseTypeId {
  const raw =
    context?.caseType ??
    context?.case_type ??
    context?.case ??
    context?.module ??
    DEFAULT_CASE_TYPE;

  return isCaseTypeId(raw) ? raw : DEFAULT_CASE_TYPE;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          reply:
            "LIVE-AI: Server missing OPENAI_API_KEY. Add it in Vercel → Settings → Environment Variables.",
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

    const message = asString(body.message).trim();
    const context =
      body?.context && typeof body.context === "object" ? body.context : {};
    const historyRaw = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({
        reply:
          "LIVE-AI: Ask your legal question. Include county + what you want to accomplish. I’ll answer and then ask follow-ups.",
        timestamp: new Date().toISOString(),
      });
    }

    const history = historyRaw
      .filter(
        (h) =>
          h &&
          (h.role === "user" || h.role === "assistant" || h.role === "system") &&
          typeof h.content === "string" &&
          h.content.trim().length > 0
      )
      .slice(-20);

    const model = (process.env.OPENAI_MODEL || "gpt-5").trim();

    const caseType = getCaseTypeFromContext(context);
    const instructions = getCaseTypeInstructions(caseType);

    const input: HistoryItem[] = [
      {
        role: "system",
        content:
          "Context (JSON): " +
          JSON.stringify(
            {
              ...context,
              caseType,
              disclaimer:
                "Decision-support only; not legal advice; California focus.",
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

    const replyText = (resp.output_text || "").trim();

    return NextResponse.json({
      reply: `LIVE-AI: ${replyText || "No text returned. Ask again."}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        reply: `LIVE-AI: Chat error: ${err?.message ?? "Unknown error"}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

