// Path: /app/api/ai/chat/route.js
import { NextResponse } from "next/server";

import { compileCaseContext } from "../../../_lib/ai/caseContextCompiler";
import { retrieveRelevantChunks } from "../../../_lib/ai/retrieval";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/chat
 * Body:
 * {
 *   caseId?: string,
 *   message: string,
 *   caseRecord?: object,          // optional for now (client can pass current case)
 *   readiness?: object,           // optional computed readiness state
 *   jurisdictionConfig?: object,  // optional
 *   topK?: number
 * }
 *
 * Returns:
 * { reply: string, nextQuestions: string[], citations: any[], meta: any }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const message = (body?.message || "").toString().trim();
    if (!message) {
      return NextResponse.json(
        { error: "Missing required field: message" },
        { status: 400 }
      );
    }

    const caseId = (body?.caseId || "").toString().trim();
    const caseRecord = body?.caseRecord || null;
    const readiness = body?.readiness || null;
    const jurisdictionConfig = body?.jurisdictionConfig || null;

    // Compile a structured context packet for the AI layer.
    const context = compileCaseContext({
      caseId,
      caseRecord,
      readiness,
      jurisdictionConfig,
    });

    // Retrieval interface (stub now; will later use embeddings + chunk store).
    const topK = Number.isFinite(Number(body?.topK)) ? Number(body.topK) : 5;
    const retrieved = await retrieveRelevantChunks({
      query: message,
      caseId: context?.caseId || caseId || "",
      caseRecord: context?.caseRecord || caseRecord,
      topK,
    });

    // ⚠️ Placeholder “AI” behavior:
    // For now we return deterministic guidance so the endpoint is usable immediately.
    // Later, replace buildDeterministicReply with an LLM call using (context + retrieved).
    const out = buildDeterministicReply({ message, context, retrieved });

    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Server error",
        detail: (err && err.message) || String(err),
      },
      { status: 500 }
    );
  }
}

function buildDeterministicReply({ message, context, retrieved }) {
  const nextQuestions = [];

  // If the client didn’t pass the caseRecord yet, we can’t do real case-specific guidance.
  if (!context?.caseRecord) {
    nextQuestions.push("Open a case and ensure the client sends caseRecord to /api/ai/chat.");
  }

  // If readiness state is present, bubble up missing fields in a neutral way.
  const missing = Array.isArray(context?.readiness?.missingFields)
    ? context.readiness.missingFields
    : [];

  if (missing.length) {
    for (const m of missing.slice(0, 6)) nextQuestions.push(m);
  }

  // Retrieval citations (stub shape kept stable)
  const citations = Array.isArray(retrieved?.citations) ? retrieved.citations : [];

  // Minimal reply: echoes intent, shows it’s working, and keeps interface stable.
  const replyLines = [];
  replyLines.push("AI endpoint is live (deterministic stub).");
  replyLines.push(`You said: "${message}"`);

  if (!context?.caseRecord) {
    replyLines.push("To enable case-specific answers, the client should include caseRecord in the request body.");
  } else {
    const role = context?.caseRecord?.role || "(unknown role)";
    const county = context?.caseRecord?.jurisdiction?.county || "(unknown county)";
    replyLines.push(`Case context received: role=${role}, county=${county}.`);
  }

  if (citations.length) {
    replyLines.push(`Retrieved ${citations.length} supporting snippet(s).`);
  }

  return {
    reply: replyLines.join("\n"),
    nextQuestions,
    citations,
    meta: {
      caseId: context?.caseId || "",
      retrievalTopK: retrieved?.meta?.topK ?? null,
      retrievalUsed: !!retrieved?.meta,
    },
  };
}

