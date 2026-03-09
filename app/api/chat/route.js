/* 3. PATH: app/api/chat/route.js */
/* 3. FILE: route.js */
/* 3. ACTION: OVERWRITE */

import { NextResponse } from "next/server";
import { getPool } from "../../_lib/server/db";
import { ensureSchema } from "../../_lib/server/ensureSchema";
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
    .slice(0, 16);
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

function isDocumentIntent(query) {
  const q = String(query || "").toLowerCase();

  return [
    "document",
    "uploaded",
    "upload",
    "file",
    "files",
    "exhibit",
    "attachment",
    "attached",
    "what does it say",
    "what does this say",
    "what does the document say",
    "what is in the document",
    "what it includes",
    "what does it include",
    "summarize the document",
    "summarise the document",
  ].some((term) => q.includes(term));
}

function formatSnippetBlock(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return "";

  const lines = [];
  lines.push("RETRIEVED_DOCUMENT_EVIDENCE:");
  lines.push("");

  hits.forEach((h, idx) => {
    lines.push(`[#${idx + 1}] ${h.docName} (docId: ${h.docId}) — section ${h.chunkIndex + 1}`);
    lines.push(h.text.length > 1200 ? `${h.text.slice(0, 1200)}…` : h.text);
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
      chunks: [],
    };
  }

  const pool = getPool();
  await ensureSchema(pool);

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

  const chunkResult = await pool.query(
    `
    select
      c.doc_id,
      c.chunk_index,
      c.chunk_text,
      d.name as doc_name,
      d.uploaded_at
    from thoxie_document_chunk c
    join thoxie_document d
      on d.doc_id = c.doc_id
    where c.case_id = $1
    order by d.uploaded_at desc, c.doc_id asc, c.chunk_index asc
    `,
    [caseId]
  );

  return {
    caseSnapshot: normalizeCaseSnapshot(caseId, caseResult.rows[0] || null),
    documents: normalizeDocuments(docsResult.rows || []),
    chunks: chunkResult.rows || [],
  };
}

function retrieveFromChunkRows({ chunkRows, query, maxHits = 6 }) {
  const terms = tokenize(query);
  const docIntent = isDocumentIntent(query);
  const hits = [];

  for (const row of chunkRows || []) {
    const text = String(row?.chunk_text || "").trim();
    if (!text) continue;

    let score = scoreChunk(text, terms);

    if (docIntent) {
      score += 20;
      if (Number(row?.chunk_index || 0) === 0) {
        score += 8;
      }
    }

    if (score <= 0) continue;

    hits.push({
      score,
      docId: row.doc_id,
      docName: row.doc_name || "Untitled document",
      chunkIndex: Number(row.chunk_index || 0),
      text,
      uploadedAt: row.uploaded_at || "",
    });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(b.uploadedAt).localeCompare(String(a.uploadedAt));
  });

  if (hits.length > 0) {
    return hits.slice(0, Math.max(1, Math.min(Number(maxHits || 6), 12)));
  }

  if (!docIntent) return [];

  const fallback = [];
  const seenDocs = new Set();

  for (const row of chunkRows || []) {
    const docId = String(row?.doc_id || "");
    if (!docId || seenDocs.has(docId)) continue;

    seenDocs.add(docId);

    fallback.push({
      score: 1,
      docId,
      docName: row.doc_name || "Untitled document",
      chunkIndex: Number(row.chunk_index || 0),
      text: String(row?.chunk_text || ""),
      uploadedAt: row.uploaded_at || "",
    });

    if (fallback.length >= Math.max(1, Math.min(Number(maxHits || 4), 8))) {
      break;
    }
  }

  return fallback;
}

function retrieveFromDocsFallback({ documents, query, maxHits = 4 }) {
  const docIntent = isDocumentIntent(query);
  if (!docIntent) return [];

  const hits = [];

  for (const doc of documents || []) {
    const text = String(doc?.extractedText || "").trim();
    if (!text) continue;

    const chunks = chunkText(text);
    if (!chunks.length) continue;

    hits.push({
      score: 1,
      docId: doc.docId,
      docName: doc.name || "Untitled document",
      chunkIndex: 0,
      text: chunks[0],
      uploadedAt: doc.uploadedAt || "",
    });
  }

  hits.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  return hits.slice(0, Math.max(1, Math.min(Number(maxHits || 4), 8)));
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
      "Uploaded evidence is now read from server-stored case documents.",
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
                "You can still use readiness checks and stored evidence retrieval without live AI."
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
                "You can still use readiness checks and stored evidence retrieval without live AI."
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
    const { caseSnapshot, documents, chunks } = await loadServerCaseAndDocs(caseId);
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

    let hits = retrieveFromChunkRows({ chunkRows: chunks, query: lastUser, maxHits: 6 });

    if (hits.length === 0) {
      hits = retrieveFromDocsFallback({ documents, query: lastUser, maxHits: 4 });
    }

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

Use the retrieved document evidence when it is present.
If the user asks about "the uploaded document" or "the file I uploaded," treat the most recently uploaded document evidence as the most likely target.
Do not give a generic answer when retrieved document evidence is present. Summarize what the retrieved document says first.

Output style:
- Use short headings.
- Be concrete.
- If discussing a document, start with "What the document appears to include".

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






