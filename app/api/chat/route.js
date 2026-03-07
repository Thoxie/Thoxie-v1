/* FILE: app/api/chat/route.js */
/* ACTION: FULL OVERWRITE EXISTING FILE */

import { NextResponse } from "next/server";
import { getPool } from "../../_lib/server/db";
import { getAIConfig, isLiveAIEnabled } from "../../_lib/ai/server/aiConfig";
import { buildChatContext } from "../../_lib/ai/server/buildChatContext";
import { classifyMessage } from "../../_lib/ai/server/domainGatekeeper";
import { GateResponses } from "../../_lib/ai/server/gateResponses";
import { evaluateCASmallClaimsReadiness } from "../../_lib/readiness/caSmallClaimsReadiness";
import { formatReadinessResponse, isReadinessIntent } from "../../_lib/readiness/readinessResponses";
import { chunkText } from "../../_lib/rag/chunkText";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitConfig,
  isKillSwitchEnabled,
  normalizeTesterId,
  parseAllowlist,
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    const raw = await resp.text();
    let data = null;

    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
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

function tokenize(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 12);
}

function scoreChunk(chunk, terms) {
  const text = String(chunk || "").toLowerCase();
  let score = 0;

  for (const t of terms) {
    const hits = text.split(t).length - 1;
    if (hits > 0) score += Math.min(8, hits) * 3;
  }

  score += Math.max(0, 6 - Math.floor(text.length / 400));
  return score;
}

function formatSnippetBlock(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return "";

  const lines = [];
  lines.push("RETRIEVED_EVIDENCE_SNIPPETS (server-authoritative):");
  lines.push("");

  hits.forEach((h, idx) => {
    lines.push(`[#${idx + 1}] ${h.docName} (docId: ${h.docId}) — chunk ${h.chunkIndex + 1}`);
    lines.push(h.text.length > 900 ? `${h.text.slice(0, 900)}…` : h.text);
    lines.push("");
  });

  return lines.join("\n").trim();
}

function normalizeCaseSnapshot(caseId, row) {
  if (!row) return null;

  const data = row.case_data && typeof row.case_data === "object" ? row.case_data : {};
  const jurisdiction =
    data.jurisdiction && typeof data.jurisdiction === "object" ? data.jurisdiction : {};

  return {
    id: data.id || row.case_id || caseId || "",
    role: data.role || "",
    category: data.category || "",
    jurisdiction,
    caseNumber: data.caseNumber || "",
    hearingDate: data.hearingDate || "",
    hearingTime: data.hearingTime || "",
    amountClaimed: String(data?.claim?.amount ?? data?.damages ?? ""),
    factsSummary: data.facts || "",
  };
}

function normalizeDocuments(rows) {
  const list = Array.isArray(rows) ? rows : [];

  return list.map((row) => ({
    docId: row.doc_id,
    caseId: row.case_id,
    name: row.name || "",
    size: Number(row.size_bytes || 0),
    mimeType: row.mime_type || "",
    uploadedAt: row.uploaded_at || "",
    docType: row.doc_type || "",
    docTypeLabel: null,
    exhibitDescription: row.exhibit_description || "",
    evidenceCategory: row.evidence_category || "",
    evidenceSupports: Array.isArray(row.evidence_supports) ? row.evidence_supports : [],
    extractedText: row.extracted_text || "",
  }));
}

async function loadServerCaseAndDocs(caseId) {
  if (!caseId) {
    return {
      caseSnapshot: null,
      documents: [],
    };
  }

  const pool = getPool();

  const caseResult = await pool.query(
    `
    select case_id, case_data, created_at, updated_at
    from thoxie_case
    where case_id = $1
    limit 1
    `,
    [caseId]
  );

  const docsResult = await pool.query(
    `
    select
      doc_id,
      case_id,
      name,
      mime_type,
      size_bytes,
      doc_type,
      exhibit_description,
      evidence_category,
      evidence_supports,
      blob_url,
      uploaded_at,
      extracted_text
    from thoxie_document
    where case_id = $1
    order by uploaded_at desc, name asc
    `,
    [caseId]
  );

  return {
    caseSnapshot: normalizeCaseSnapshot(caseId, caseResult.rows[0] || null),
    documents: normalizeDocuments(docsResult.rows || []),
  };
}

function retrieveServerSnippets({ documents, query, maxHits = 6 }) {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const hits = [];

  for (const doc of documents) {
    const text = String(doc?.extractedText || "").trim();
    if (!text) continue;

    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i += 1) {
      const ch = String(chunks[i] || "");
      if (!ch) continue;

      const score = scoreChunk(ch, terms);
      if (score <= 0) continue;

      hits.push({
        score,
        docId: doc.docId,
        docName: doc.name || "Untitled document",
        chunkIndex: i,
        text: ch,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, Math.max(1, Math.min(Number(maxHits || 6), 12)));
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const baseDeterministic = [
      "I can help with your California small-claims case.",
      "Try: “what’s missing for filing” for readiness.",
      "Uploaded evidence is now read from server-stored case documents."
    ].join("\n");

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
                "You can still use readiness checks and server-stored evidence retrieval without AI."
              ].join("\n"),
            },
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
                "You can still use readiness checks and server-stored evidence retrieval without AI."
              ].join("\n"),
            },
          },
          403
        );
      }
    }

    const rlCfg = getRateLimitConfig();
    const rlKey = `chat:${allowlist.length > 0 ? testerId : ip}`;
    const rl = checkRateLimit({
      key: rlKey,
      limit: rlCfg.perMin,
      windowSec: rlCfg.windowSec,
    });

    if (!rl.ok) {
      return json(
        {
          ok: true,
          provider: "none",
          mode: "rate_limited",
          reply: {
            role: "assistant",
            content: `Rate limit reached. Please wait ${rl.resetInSec}s and try again.`,
          },
          meta: { resetInSec: rl.resetInSec },
        },
        429
      );
    }

    const msgs = safeMessages(body.messages);
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content || "";

    const classification = classifyMessage(lastUser);
    if (classification.type === "off_topic") {
      return json({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.off_topic },
      });
    }
    if (classification.type === "empty") {
      return json({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.empty },
      });
    }
    if (classification.type === "admin") {
      return json({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.admin },
      });
    }

    const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
    const { caseSnapshot, documents } = await loadServerCaseAndDocs(caseId);
    const contextText = buildChatContext({ caseId, caseSnapshot, documents });

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
            "This readiness check is using stored case data and stored document metadata from the server."
          ].join("\n"),
        },
      });
    }

    const hits = retrieveServerSnippets({ documents, query: lastUser, maxHits: 6 });
    const snippetBlock = formatSnippetBlock(hits);

    const cfg = getAIConfig();
    const provider = cfg?.provider || "none";
    const liveAI = isLiveAIEnabled(cfg);
    const killSwitchOn = isKillSwitchEnabled();

    if (!killSwitchOn || !liveAI || provider !== "openai") {
      const reason = !killSwitchOn
        ? "(AI disabled by kill switch.)"
        : !liveAI || provider !== "openai"
          ? "(AI unavailable — deterministic mode.)"
          : "";

      const content = snippetBlock
        ? `${baseDeterministic}\n\n${reason}\n\n${snippetBlock}`.trim()
        : `${baseDeterministic}\n\n${reason}`.trim();

      return json({
        ok: true,
        provider: "none",
        mode: "deterministic",
        reply: { role: "assistant", content },
      });
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
    const ai = await fetchOpenAIChat({
      apiKey,
      model,
      messages: finalMessages,
      timeoutMs,
    });

    if (!ai.ok) {
      const fallback = [
        baseDeterministic,
        "",
        "(AI temporarily unavailable — falling back to deterministic mode.)",
        ai.error ? `Reason: ${ai.error}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return json({
        ok: true,
        provider: "none",
        mode: "deterministic_fallback",
        reply: {
          role: "assistant",
          content: snippetBlock ? `${fallback}\n\n${snippetBlock}` : fallback,
        },
      });
    }

    return json({
      ok: true,
      provider: "openai",
      mode: "ai",
      reply: { role: "assistant", content: ai.content },
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}








