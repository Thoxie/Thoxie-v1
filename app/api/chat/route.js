// Path: /app/api/chat/route.js

import { NextResponse } from "next/server";
import { getAIConfig } from "../../_lib/ai/server/aiConfig";
import { buildChatContext } from "../../_lib/ai/server/buildChatContext";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function safeMessages(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "user";
    const content = typeof m.content === "string" ? m.content : "";
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role, content: trimmed });
  }
  return out.slice(-50);
}

function deterministicGuidance({ contextText, lastUser }) {
  const t = (lastUser || "").toLowerCase();

  // High-signal deterministic responses (server authoritative)
  if (t.includes("summary") || t.includes("summarize") || t.includes("overview")) {
    return [
      "Here is the server-side case context snapshot I received:",
      "",
      contextText,
      "",
      "Tell me what you want next: (1) missing evidence, (2) filing readiness, or (3) tighten your fact pattern."
    ].join("\n");
  }

  if (t.includes("missing") || t.includes("what's missing") || t.includes("whats missing")) {
    const hasDocs = contextText.includes("DOCUMENT_INVENTORY\n- (no documents provided)") ? false : true;

    const missing = [];
    if (contextText.includes("county: (not set)")) missing.push("Jurisdiction county");
    if (contextText.includes("courtName: (not set)")) missing.push("Court name");
    if (contextText.includes("role: (not set)")) missing.push("Plaintiff/Defendant role");
    if (contextText.includes("category: (not set)")) missing.push("Case category");
    if (contextText.includes("factsSummary: (not set)")) missing.push("Short facts summary (2–6 sentences)");
    if (!hasDocs) missing.push("At least 1 key document (receipt/contract/messages/photos)");

    if (missing.length === 0) {
      return [
        "Nothing critical is missing for a basic v1 packet.",
        "Next best move: paste your 2–6 sentence fact pattern and I’ll suggest a small-claims-ready structure (chronology + damages + evidence mapping)."
      ].join("\n");
    }

    return [
      "Top missing items (server-side check, based on provided context):",
      ...missing.map((x) => `- ${x}`),
      "",
      "If you tell me your claim type (e.g., unpaid invoice, property damage, refund), I’ll specify the best evidence to upload next."
    ].join("\n");
  }

  if (t.includes("next steps") || t.includes("what next") || t.includes("what should i do")) {
    return [
      "Server-side next steps (v1):",
      "1) Confirm jurisdiction fields (county + court).",
      "2) Tighten facts summary: one paragraph, chronological, names + dates + amounts.",
      "3) Upload top evidence: contract/receipt/messages/photos (as applicable).",
      "4) Verify damages math and remedy request.",
      "5) Generate/preview the filing packet, then confirm service plan.",
      "",
      "If you paste your fact pattern, I will output a structured outline (issues → elements → evidence → damages)."
    ].join("\n");
  }

  return [
    "I received your message and the case/doc context snapshot.",
    "Try one of: “summary”, “what’s missing”, “next steps”.",
    "Or paste your fact pattern (2–6 sentences) and what outcome you want (money/refund/repair), and I’ll structure it for CA small claims."
  ].join("\n");
}

async function callOpenAI({ apiKey, model, messages }) {
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
    })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`OpenAI error ${resp.status}: ${text}`.slice(0, 800));
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
    const mode = typeof body.mode === "string" ? body.mode.trim() : "hybrid";
    const clientCaseSnapshot = body.caseSnapshot;
    const clientDocuments = body.documents;

    const msgs = safeMessages(body.messages);
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content || "";

    const contextText = buildChatContext({
      caseId,
      caseSnapshot: clientCaseSnapshot,
      documents: clientDocuments
    });

    // Always return deterministic guidance if AI isn’t configured.
    const cfg = getAIConfig();
    const provider = cfg?.provider || "none";
    const apiKey = cfg?.openaiApiKey || "";
    const model = cfg?.openaiModel || "gpt-4o-mini";

    const system = [
      "You are THOXIE, a California small-claims decision-support assistant.",
      "You are NOT a lawyer and you do not provide legal advice.",
      "You help the user organize facts, evidence, deadlines, and draft-ready structure.",
      "Prefer step-by-step guidance and checklists.",
      "",
      "Use the following context snapshot:",
      contextText
    ].join("\n");

    // If no provider configured, reply deterministically (stable beta behavior).
    if (provider !== "openai" || !apiKey) {
      const replyText = deterministicGuidance({ contextText, lastUser });
      return json({
        ok: true,
        provider: "none",
        mode,
        reply: { role: "assistant", content: replyText }
      });
    }

    // If provider configured, do hybrid:
    // - keep the conversation messages
    // - prepend system context
    const finalMessages = [{ role: "system", content: system }, ...msgs];

    const content = await callOpenAI({ apiKey, model, messages: finalMessages });

    // Fallback if model returns empty
    const replyText = content || deterministicGuidance({ contextText, lastUser });

    return json({
      ok: true,
      provider: "openai",
      mode,
      reply: { role: "assistant", content: replyText }
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}






