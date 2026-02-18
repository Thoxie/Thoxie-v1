// Path: /app/api/chat/route.js
import { NextResponse } from "next/server";
import { getAIConfig, isLiveAIEnabled } from "../../_lib/ai/server/aiConfig";

function normalizeMessages(messages) {
  const out = [];
  for (const m of messages || []) {
    if (!m || typeof m !== "object") continue;
    const role = typeof m.role === "string" ? m.role : "";
    const content = typeof m.content === "string" ? m.content : "";
    if (!role || !content) continue;
    if (!["system", "user", "assistant"].includes(role)) continue;
    out.push({ role, content });
  }
  return out.slice(-50);
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {}

  const cfg = getAIConfig();
  const caseId = typeof body.caseId === "string" ? body.caseId : null;
  const mode = typeof body.mode === "string" ? body.mode : "chat";
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const messages = normalizeMessages(body.messages);

  if (!isLiveAIEnabled(cfg)) {
    return NextResponse.json(
      {
        ok: true,
        usedLiveModel: false,
        provider: null,
        model: null,
        mode,
        caseId,
        reply: {
          role: "assistant",
          content:
            "Server placeholder active. Configure THOXIE_AI_PROVIDER=openai and THOXIE_OPENAI_API_KEY to enable live AI."
        },
        meta: {
          messageCount: messages.length,
          promptLength: prompt.length,
          ts: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  }

  // Keep stable even if live is enabled but not implemented here yet.
  return NextResponse.json(
    {
      ok: true,
      usedLiveModel: false,
      provider: "openai",
      model: cfg?.openai?.model || null,
      mode,
      caseId,
      reply: {
        role: "assistant",
        content: "Live AI is enabled in config, but live-call code is not enabled in this route."
      },
      meta: { messageCount: messages.length, ts: new Date().toISOString() }
    },
    { status: 200 }
  );
}


