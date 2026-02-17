// Path: /app/api/ai/chat/route.js
import { NextResponse } from "next/server";
import { getAIConfig, isLiveAIEnabled } from "../../../_lib/ai/server/aiConfig";

/**
 * POST /api/ai/chat
 * Accepts: { caseId?, messages?, prompt?, mode? }
 * Returns: { ok, usedLiveModel, reply, ... }
 */
export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const cfg = getAIConfig();
  const mode = typeof body.mode === "string" ? body.mode : "chat";
  const caseId = typeof body.caseId === "string" ? body.caseId : null;
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];

  const messages = normalizeMessages({ prompt, messages: incomingMessages });

  if (!isLiveAIEnabled(cfg)) {
    return NextResponse.json(
      {
        ok: true,
        mode,
        caseId,
        usedLiveModel: false,
        reply: {
          role: "assistant",
          content:
            "THOXIE AI backend is online (deterministic placeholder). Set THOXIE_AI_PROVIDER=openai and THOXIE_OPENAI_API_KEY to enable live calls.",
        },
        trace: { messageCount: messages.length, ts: new Date().toISOString() },
      },
      { status: 200 }
    );
  }

  // Live OpenAI call (safe fallback)
  try {
    const live = await callOpenAI({ cfg, messages });
    return NextResponse.json(
      {
        ok: true,
        mode,
        caseId,
        usedLiveModel: true,
        provider: "openai",
        model: cfg.openai.model,
        reply: live.reply,
        usage: live.usage || null,
        trace: { messageCount: messages.length, ts: new Date().toISOString() },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: true,
        mode,
        caseId,
        usedLiveModel: false,
        reply: {
          role: "assistant",
          content: `Live AI failed; using fallback placeholder. (${safeErr(err)})`,
        },
        trace: { messageCount: messages.length, ts: new Date().toISOString() },
      },
      { status: 200 }
    );
  }
}

function normalizeMessages({ prompt, messages }) {
  const out = [];
  if (prompt && prompt.trim()) out.push({ role: "system", content: prompt.trim() });

  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const role = typeof m.role === "string" ? m.role : "";
    const content = typeof m.content === "string" ? m.content : "";
    if (!role || !content) continue;
    if (!["system", "user", "assistant"].includes(role)) continue;
    out.push({ role, content });
  }

  if (out.length === 0) out.push({ role: "user", content: "ping" });
  return out.slice(-50);
}

function safeErr(err) {
  if (!err) return "unknown";
  if (typeof err === "string") return err.slice(0, 180);
  if (typeof err.message === "string") return err.message.slice(0, 180);
  return "unknown";
}

async function callOpenAI({ cfg, messages }) {
  const apiKey = cfg.openai.apiKey;
  const model = cfg.openai.model || "gpt-4o-mini";

  const controller = new AbortController();
  const timeoutMs = Math.max(1000, Math.min(cfg.openai.timeoutMs || 20000, 60000));
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`openai_http_${res.status}:${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return {
      reply: { role: "assistant", content: String(content) || "(empty response)" },
      usage: data?.usage || null,
    };
  } finally {
    clearTimeout(t);
  }
}


