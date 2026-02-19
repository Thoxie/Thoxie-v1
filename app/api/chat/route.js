// Path: /app/api/chat/route.js

import { NextResponse } from "next/server";
import { getAIConfig, isLiveAIEnabled } from "../../_lib/ai/server/aiConfig";
import { buildChatContext } from "../../_lib/ai/server/buildChatContext";
import { classifyMessage } from "../../_lib/ai/server/domainGatekeeper";
import { GateResponses } from "../../_lib/ai/server/gateResponses";
import { evaluateCASmallClaimsReadiness } from "../../_lib/readiness/caSmallClaimsReadiness";
import { formatReadinessResponse, isReadinessIntent } from "../../_lib/readiness/readinessResponses";
import { retrieveSnippets, formatSnippetsForChat } from "../../_lib/rag/retrieve";

import { checkRateLimit, getClientIp, parseCsvAllowlist } from "../../_lib/ai/server/rateLimit";

function json(data, status = 200, headers = undefined) {
  return NextResponse.json(data, { status, headers });
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

function envBool(name, defaultValue = true) {
  const v = (process.env[name] || "").toLowerCase().trim();
  if (!v) return defaultValue;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return defaultValue;
}

function envInt(name, defaultValue) {
  const n = parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) ? n : defaultValue;
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
      // leave data null
    }

    if (!resp.ok) {
      const msg = data?.error?.message || `OpenAI request failed (HTTP ${resp.status}).`;
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

    // -------------------------
    // HARD LIMITS (budget / abuse)
    // -------------------------
    const MAX_LAST_USER_CHARS = envInt("THOXIE_AI_MAX_USER_CHARS", 4000);
    const MAX_TOTAL_CHARS = envInt("THOXIE_AI_MAX_TOTAL_CHARS", 20000);

    if (lastUser.length > MAX_LAST_USER_CHARS) {
      return json(
        {
          ok: true,
          provider: "none",
          mode: "deterministic",
          reply: {
            role: "assistant",
            content: `Your message is too long. Please keep it under ${MAX_LAST_USER_CHARS} characters and resend.`
          }
        },
        200
      );
    }

    const totalChars = msgs.reduce((sum, m) => sum + (m?.content?.length || 0), 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return json(
        {
          ok: true,
          provider: "none",
          mode: "deterministic",
          reply: {
            role: "assistant",
            content:
              "This conversation payload is too large for beta safety limits. Please clear chat history for this case (or start a new case chat) and resend a shorter question."
          }
        },
        200
      );
    }

    // -------------------------
    // DOMAIN GATEKEEPER (unchanged)
    // -------------------------
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
    // -------------------------

    const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
    const caseSnapshot = body.caseSnapshot || null;
    const documents = body.documents || [];

    const contextText = buildChatContext({ caseId, caseSnapshot, documents });

    // -------------------------
    // READINESS ENGINE (unchanged)
    // -------------------------
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
    // -------------------------

    // -------------------------
    // RAG RETRIEVAL (Phase-1 keyword retrieval) (unchanged)
    // -------------------------
    const hits = retrieveSnippets({ caseId, query: lastUser });
    const snippetBlock = formatSnippetsForChat(hits);
    // -------------------------

    // Deterministic fallback content (always available)
    const baseDeterministic = [
      "I can help with your California small-claims case.",
      "Try: “what’s missing” for readiness.",
      "For evidence-backed answers: use “Sync Docs” (Phase-1 RAG)."
    ].join("\n");

    // -------------------------
    // KILL SWITCH (NEW)
    // -------------------------
    const aiEnabled = envBool("THOXIE_AI_ENABLED", true);
    if (!aiEnabled) {
      return json({
        ok: true,
        provider: "none",
        mode: "deterministic",
        reply: {
          role: "assistant",
          content: [
            baseDeterministic,
            "",
            "(AI is currently disabled by the operator.)",
            snippetBlock ? `\n${snippetBlock}` : ""
          ]
            .filter(Boolean)
            .join("\n")
        }
      });
    }

    // -------------------------
    // OPTIONAL BETA ALLOWLIST (NEW)
    // -------------------------
    const allowlistCsv = process.env.THOXIE_BETA_ALLOWLIST || "";
    const allowlist = parseCsvAllowlist(allowlistCsv);

    let testerId = "";
    if (typeof body.testerId === "string") testerId = body.testerId.trim();
    if (!testerId) testerId = (req.headers.get("x-thoxie-tester") || "").trim();

    if (allowlist.length > 0) {
      const normalized = testerId.toLowerCase();
      const ok = normalized && allowlist.includes(normalized);

      if (!ok) {
        return json({
          ok: true,
          provider: "none",
          mode: "deterministic",
          reply: {
            role: "assistant",
            content:
              "Beta access is restricted. Please enter your tester email in the chat panel (Beta ID) and try again."
          }
        });
      }
    }

    // -------------------------
    // RATE LIMIT (NEW)
    // -------------------------
    const ip = getClientIp(req);
    const limitPerMin = envInt("THOXIE_AI_RATE_LIMIT_PER_MIN", 20);
    const windowSec = envInt("THOXIE_AI_RATE_LIMIT_WINDOW_SEC", 60);

    const limiterKey = `chat:${ip}:${testerId || "anon"}`;
    const rl = checkRateLimit({ key: limiterKey, limit: limitPerMin, windowMs: windowSec * 1000 });

    if (!rl.ok) {
      return json(
        {
          ok: false,
          error: "Rate limit exceeded. Please wait and try again.",
          retryAfterSec: rl.retryAfterSec
        },
        429,
        {
          "Retry-After": String(rl.retryAfterSec || 15)
        }
      );
    }

    // -------------------------
    // LIVE AI DECISION (existing + safe defaults)
    // -------------------------
    const cfg = getAIConfig();
    const provider = cfg?.provider || "none";
    const liveAI = isLiveAIEnabled(cfg);

    // If AI is not enabled by config, return deterministic + snippets
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

    const system = `
You are THOXIE, a California small-claims decision-support assistant.
You are not a lawyer and do not provide legal advice.
Stay on-topic: California small claims only.
Use retrieved evidence snippets when available; cite document name + chunk number.

Output format requirement:
- Use headings and checklists.
- If you need facts, ask tight follow-up questions.

Context:
${contextText}

${snippetBlock ? `\n\n${snippetBlock}\n` : ""}
`.trim();

    const finalMessages = [{ role: "system", content: system }, ...msgs];

    const ai = await fetchOpenAIChat({ apiKey, model, messages: finalMessages, timeoutMs });

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









