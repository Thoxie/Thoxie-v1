// Path: /app/api/chat/route.js

import { NextResponse } from "next/server";
import { getAIConfig } from "../../_lib/ai/server/aiConfig";
import { buildChatContext } from "../../_lib/ai/server/buildChatContext";
import { classifyMessage } from "../../_lib/ai/server/domainGatekeeper";
import { GateResponses } from "../../_lib/ai/server/gateResponses";
import { evaluateCASmallClaimsReadiness } from "../../_lib/readiness/caSmallClaimsReadiness";
import { formatReadinessResponse, isReadinessIntent } from "../../_lib/readiness/readinessResponses";

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
      return json({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.off_topic }
      });
    }

    if (classification.type === "empty") {
      return json({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.empty }
      });
    }

    if (classification.type === "admin") {
      return json({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.admin }
      });
    }
    // ---------- END GATE ----------

    const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
    const caseSnapshot = body.caseSnapshot || null;
    const documents = body.documents || [];

    const contextText = buildChatContext({
      caseId,
      caseSnapshot,
      documents
    });

    // ---------- READINESS ENGINE (server authoritative) ----------
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
            "If you paste your 2–6 sentence fact pattern, I can help you tighten it and map evidence → damages (still not legal advice)."
          ].join("\n")
        }
      });
    }
    // ---------- END READINESS ----------

    const cfg = getAIConfig();
    const provider = cfg?.provider || "none";
    const apiKey = cfg?.openaiApiKey || "";
    const model = cfg?.openaiModel || "gpt-4o-mini";

    const system = `
You are THOXIE, a California small-claims decision-support assistant.
You are not a lawyer and do not provide legal advice.
Help users organize facts, evidence, deadlines, and procedures.
Stay on-topic: California small claims only.

Context:
${contextText}
`.trim();

    // No AI configured → deterministic, on-mission response
    if (provider !== "openai" || !apiKey) {
      return json({
        ok: true,
        provider: "none",
        reply: {
          role: "assistant",
          content:
            "I’m ready to help with your California small-claims case. Ask about filing steps, evidence, deadlines, service, or type “what’s missing” for a readiness check."
        }
      });
    }

    // AI enabled (future). Still protected by gatekeeper + context.
    const finalMessages = [{ role: "system", content: system }, ...msgs];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        temperature: 0.2
      })
    });

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return json({
      ok: true,
      provider: "openai",
      reply: { role: "assistant", content }
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}







