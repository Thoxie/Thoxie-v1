// Path: /app/api/chat/route.js
import { NextResponse } from "next/server";
import { getAIConfig, isLiveAIEnabled } from "../../_lib/ai/server/aiConfig";
import { buildChatContext } from "../../_lib/ai/server/buildChatContext";
import { classifyMessage } from "../../_lib/ai/server/domainGatekeeper";
import { GateResponses } from "../../_lib/ai/server/gateResponses";
import { evaluateCASmallClaimsReadiness } from "../../_lib/readiness/caSmallClaimsReadiness";
import { formatReadinessResponse, isReadinessIntent } from "../../_lib/readiness/readinessResponses";
import { retrieveSnippets, formatSnippetsForChat } from "../../_lib/rag/retrieve";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitConfig,
  isKillSwitchEnabled,
  normalizeTesterId,
  parseAllowlist
} from "../../_lib/ai/server/rateLimit";

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
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      signal: controller.signal
    });

    const raw = await resp.text();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // ignore
    }

    if (!resp.ok) {
      const msg = data?.error?.message || `OpenAI request failed (HTTP ${resp.status}).`;
      return { ok: false, error: msg };
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return { ok: false, error: "OpenAI returned an empty response." };
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
    if (!body || typeof body !== "object") return json({ ok: false, error: "Invalid JSON body" }, 400);

    const baseDeterministic = [
      "I can help with your California small-claims case.",
      "Try: “what’s missing for filing” for readiness.",
      "For evidence-backed answers: use “Sync Docs” (Phase-1 RAG)."
    ].join("\n");

    // ---------- BETA ACCESS CONTROL ----------
    const allowlist = parseAllowlist(process.env.THOXIE_BETA_ALLOWLIST);
    const testerId = normalizeTesterId(body.testerId);
    const ip = getClientIp(req);

    if (allowlist.length > 0) {
      if (!testerId) {
        return json(
          {
            ok: true,
            provider: "none",
            mode: "beta_restricted",
            reply: {
              role: "assistant",
              content: [
                "Beta access is restricted.",
                "Enter your tester ID in the chat panel to enable AI.",
                "You can still use readiness checks and Sync Docs evidence retrieval without AI."
              ].join("\n")
            }
          },
          403
        );
      }

      if (!allowlist.includes(testerId)) {
        return json(
          {
            ok: true,
            provider: "none",
            mode: "beta_restricted",
            reply: {
              role: "assistant",
              content: [
                "Beta access is restricted for this tester ID.",
                "You can still use readiness checks and Sync Docs evidence retrieval without AI."
              ].join("\n")
            }
          },
          403
        );
      }
    }

    // ---------- RATE LIMITING ----------
    const rlCfg = getRateLimitConfig();
    const rlKey = `chat:${allowlist.length > 0 ? testerId : ip}`;
    const rl = checkRateLimit({ key: rlKey, limit: rlCfg.perMin, windowSec: rlCfg.windowSec });

    if (!rl.ok) {
      return json(
        {
          ok: true,
          provider: "none",
          mode: "rate_limited",
          reply: { role: "assistant", content: `Rate limit reached. Please wait ${rl.resetInSec}s and try again.` },
          meta: { resetInSec: rl.resetInSec }
        },
        429
      );
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

    const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
    const caseSnapshot = body.caseSnapshot || null;
    const documents = body.documents || [];
    const contextText = buildChatContext({ caseId, caseSnapshot, documents });

    // ---------- READINESS ENGINE (ONLY when explicitly asked) ----------
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

    // ---------- RAG RETRIEVAL ----------
    const hits = retrieveSnippets({ caseId, query: lastUser });
    const snippetBlock = formatSnippetsForChat(hits);

    const cfg = getAIConfig();
    const provider = cfg?.provider || "none";
    const liveAI = isLiveAIEnabled(cfg);
    const killSwitchOn = isKillSwitchEnabled();

    // If AI is not enabled, return deterministic + snippets
    if (!killSwitchOn || !liveAI || provider !== "openai") {
      const reason = !killSwitchOn
        ? "(AI disabled by kill switch.)"
        : !liveAI || provider !== "openai"
          ? "(AI unavailable — deterministic mode.)"
          : "";

      const content = snippetBlock
        ? `${baseDeterministic}\n\n${reason}\n\n${snippetBlock}`.trim()
        : `${baseDeterministic}\n\n${reason}`.trim();

      return json({ ok: true, provider: "none", mode: "deterministic", reply: { role: "assistant", content } });
    }

    const apiKey = cfg.openai.apiKey;
    const model = cfg.openai.model || "gpt-4o-mini";
    const timeoutMs = cfg.openai.timeoutMs || 20000;

    const system = `
You are THOXIE, a California small-claims decision-support assistant.
You are not a lawyer and do not provide legal advice.
Stay on-topic: California small claims only.

Output style (required):
- Use headings and bullet lists.
- Provide: (1) Key issues, (2) What must be proven, (3) Evidence checklist, (4) Filing/next steps, (5) Risks/limits, (6) Follow-up questions.

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

    return json({ ok: true, provider: "openai", mode: "ai", reply: { role: "assistant", content: ai.content } });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}








