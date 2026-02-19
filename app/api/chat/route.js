// Path: /app/api/chat/route.js

import { NextResponse } from "next/server";
import { getAIConfig, isLiveAIEnabled } from "../../_lib/ai/server/aiConfig";
import { buildChatContext } from "../../_lib/ai/server/buildChatContext";
import { classifyMessage } from "../../_lib/ai/server/domainGatekeeper";
import { GateResponses } from "../../_lib/ai/server/gateResponses";
import { evaluateCASmallClaimsReadiness } from "../../_lib/readiness/caSmallClaimsReadiness";
import { formatReadinessResponse, isReadinessIntent } from "../../_lib/readiness/readinessResponses";
import { retrieveSnippets, formatSnippetsForChat } from "../../_lib/rag/retrieve";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function safeMessages(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "user" ? "user" : "assistant";
    const content = typeof m.content === "string" ? m.content : "";
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role, content: trimmed });
  }
  return out.slice(-50);
}

async function fetchOpenAIChat({ apiKey, model, messages, timeoutMs }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs || 20000)));

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2
      }),
      signal: controller.signal
    });

    const raw = await resp.text();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // leave data null; raw will be used for error details if needed
    }

    if (!resp.ok) {
      const msg =
        data?.error?.message ||
        `OpenAI request failed (HTTP ${resp.status}).`;

      return { ok: false, error: msg };
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return { ok: false, error: "OpenAI returned an empty response." };
    }

    return { ok: true, content: content.trim() };
  } catch (e) {
    const msg = e?.name === "AbortError" ? "OpenAI request timed out." : String(e?.message || e);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const msgs = safeMessages(body.messages);
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content || "";

    // ---------- DOMAIN GATEKEEPER ----------
    const classification = classifyMessage(lastUser);

    if (classification.type === "off_topic") {
      return json({ ok: true, provider: "none", reply: { role: "assistant", content: GateResponses.off_topic } });
    }
    if (classification.type === "empty") {
      return json({ ok: true, provider: "none", reply: { role: "assistant", content: GateResponses.empty } });
    }
    if (classification.type === "admin") {
      return json({ ok: true, provider: "none", reply: { role: "assistant", content: GateResponses.admin } });
    }
    // ---------- END GATE ----------

    const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
    const caseSnapshot = body.caseSnapshot || null;
    const documents = body.documents || [];

    const contextText = buildChatContext({ caseId, caseSnapshot, documents });

    // ---------- READINESS ENGINE ----------
    if (isReadinessIntent(lastUser)) {
      const readiness = evaluateCASmallClaimsReadiness({ caseSnapshot, documents });
      const readinessText = formatReadinessResponse(readiness);

      return json({
        ok: true,
        provider: "none",
        mode: "readiness",
        readiness,
        reply: {
          role: "assistant",
          content: [
            "Server-authoritative readiness check (CA small claims v1):",
            "",
            readinessText,
            "",
            "Tip: for evidence-based answers, click “Sync Docs” in the chat panel (Phase-1 RAG)."
          ].join("\n")
        }
      });
    }
    // ---------- END READINESS ----------

    // ---------- RAG RETRIEVAL (Phase-1 keyword retrieval) ----------
    const hits = retrieveSnippets({ caseId, query: lastUser });
    const snippetBlock = formatSnippetsForChat(hits);
    // ---------- END RAG ----------

    const cfg = getAIConfig();
    const provider = cfg?.provider || "none";
    const liveAI = isLiveAIEnabled(cfg);

    // Deterministic fallback content (always available)
    const baseDeterministic = [
      "I can help with your California small-claims case.",
      "Try: “what’s missing” for readiness.",
      "For evidence-backed answers: use “Sync Docs” (Phase-1 RAG)."
    ].join("\n");

    // If AI is not enabled, return deterministic + snippets
    if (!liveAI || provider !== "openai") {
      return json({
        ok: true,
        provider: "none",
        mode: "deterministic",
        reply: {
          role: "assistant",
          content: snippetBlock ? `${baseDeterministic}\n\n${snippetBlock}` : baseDeterministic
        }
      });
    }

    const apiKey = cfg.openai.apiKey;
    const model = cfg.openai.model || "gpt-4o-mini";
    const timeoutMs = cfg.openai.timeoutMs || 20000;

    // AI enabled: inject context + snippets into system prompt
    const system = `
You are THOXIE, a California small-claims decision-support assistant.
You are not a lawyer and do not provide legal advice.
Stay on-topic: California small claims only.
Use retrieved evidence snippets when available; cite document name + chunk number.

Context:
${contextText}

${snippetBlock ? `\n\n${snippetBlock}\n` : ""}
`.trim();

    const finalMessages = [{ role: "system", content: system }, ...msgs];

    const ai = await fetchOpenAIChat({ apiKey, model, messages: finalMessages, timeoutMs });

    // If OpenAI fails, degrade gracefully (do NOT return blank)
    if (!ai.ok) {
      const fallback = [
        baseDeterministic,
        "",
        "(AI temporarily unavailable — falling back to deterministic mode.)",
        ai.error ? `Reason: ${ai.error}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      return json({
        ok: true,
        provider: "none",
        mode: "deterministic_fallback",
        reply: { role: "assistant", content: snippetBlock ? `${fallback}\n\n${snippetBlock}` : fallback }
      });
    }

    return json({
      ok: true,
      provider: "openai",
      mode: "ai",
      reply: { role: "assistant", content: ai.content }
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}










