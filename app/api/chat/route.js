// Path: /app/api/chat/route.js
import { NextResponse } from "next/server";
import { getAIConfig, isLiveAIEnabled } from "../../_lib/ai/server/aiConfig";

function normalizeMessages({ prompt, messages }) {
  const out = [];

  if (typeof prompt === "string" && prompt.trim()) {
    out.push({ role: "system", content: prompt.trim() });
  }

  for (const m of messages || []) {
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
  if (typeof err === "string") return err.slice(0, 200);
  if (typeof err.message === "string") return err.message.slice(0, 200);
  return "unknown";
}

async function callOpenAI({ cfg, messages }) {
  const apiKey = cfg?.openai?.apiKey;
  const model = cfg?.openai?.model || "gpt-4o-mini";

  const controller = new AbortController();
  const timeoutMs = Math.max(1000, Math.min(cfg?.openai?.timeoutMs || 20000, 60000));
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2
      }),
      signal: controller.signal
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
      model
    };
  } finally {
    clearTimeout(t);
  }
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
  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];

  const messages = normalizeMessages({ prompt, messages: incomingMessages });

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
          ts: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  }

  try {
    const live = await callOpenAI({ cfg, messages });
    return NextResponse.json(
      {
        ok: true,
        usedLiveModel: true,
        provider: "openai",
        model: live.model || cfg?.openai?.model || null,
        mode,
        caseId,
        reply: live.reply,
        usage: live.usage || null,
        meta: {
          messageCount: messages.length,
          ts: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  } catch (err) {
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
          content: `Live AI failed; using fallback placeholder. (${safeErr(err)})`
        },
        meta: {
          messageCount: messages.length,
          ts: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  }
}



