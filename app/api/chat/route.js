// FILE: route.js
// PATH: app/api/chat/route.js
// ACTION: OVERWRITE

import { NextResponse } from "next/server";
import { getPool } from "../../_lib/server/db";
import { ensureSchema } from "../../_lib/server/ensureSchema";
import { getAIConfig, isLiveAIEnabled } from "../../_lib/ai/server/aiConfig";
import { buildChatContext } from "../../_lib/ai/server/buildChatContext";
import {
  classifyMessage,
  isAdminIntent,
  isDocumentAnalysisIntent,
} from "../../_lib/ai/server/domainGatekeeper";
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
    .slice(0, 20);
}

function scoreChunk(chunk, terms) {
  const text = String(chunk || "").toLowerCase();
  let score = 0;

  for (const t of terms) {
    const hits = text.split(t).length - 1;
    if (hits > 0) score += Math.min(10, hits) * 3;
  }

  score += Math.max(0, 6 - Math.floor(text.length / 450));
  return score;
}

function isPluralEvidenceQuestion(query) {
  const q = String(query || "").toLowerCase();
  return (
    q.includes("documents") ||
    q.includes("files") ||
    q.includes("evidence") ||
    q.includes("exhibits") ||
    q.includes("all uploaded") ||
    q.includes("all documents") ||
    q.includes("uploaded evidence")
  );
}

function isDirectExtractedTextIntent(query) {
  const q = String(query || "").toLowerCase();
  if (!q) return false;

  const wantsDisplay =
    q.includes("show") ||
    q.includes("display") ||
    q.includes("print") ||
    q.includes("dump") ||
    q.includes("return") ||
    q.includes("give me") ||
    q.includes("paste");

  const wantsStoredText =
    q.includes("extracted text") ||
    q.includes("stored text") ||
    q.includes("ocr text") ||
    q.includes("raw text") ||
    q.includes("document text") ||
    q.includes("text in the database") ||
    q.includes("text from the database") ||
    q.includes("database text") ||
    q.includes("full text") ||
    q.includes("all text");

  return wantsDisplay && wantsStoredText;
}

function scoreDocumentNameMatch(docName, query) {
  const nameTerms = tokenize(String(docName || ""));
  const queryTerms = new Set(tokenize(query));
  let score = 0;

  for (const term of nameTerms) {
    if (queryTerms.has(term)) score += 5;
  }

  const lowerName = String(docName || "").toLowerCase();
  const lowerQuery = String(query || "").toLowerCase();
  if (lowerName && lowerQuery.includes(lowerName)) score += 20;

  return score;
}

function sortDocumentsNewestFirst(documents) {
  return [...(documents || [])].sort((a, b) =>
    String(b?.uploadedAt || "").localeCompare(String(a?.uploadedAt || ""))
  );
}

function selectDocumentsForDirectText(documents, query) {
  const docsWithText = sortDocumentsNewestFirst(documents).filter((doc) =>
    String(doc?.extractedText || "").trim()
  );

  if (docsWithText.length === 0) return [];

  const q = String(query || "").toLowerCase();
  const wantsAll =
    q.includes("all") ||
    q.includes("database") ||
    q.includes("every") ||
    q.includes("all documents") ||
    q.includes("all extracted text");

  const scored = docsWithText
    .map((doc) => ({ doc, score: scoreDocumentNameMatch(doc.name, query) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.doc?.uploadedAt || "").localeCompare(String(a.doc?.uploadedAt || ""));
    });

  if (!wantsAll && scored[0]?.score > 0) {
    return [scored[0].doc];
  }

  return wantsAll ? scored.slice(0, 3).map((entry) => entry.doc) : [scored[0].doc];
}

function buildDirectTextResponse(documents, query) {
  const selected = selectDocumentsForDirectText(documents, query);

  if (selected.length === 0) {
    const totalDocs = Array.isArray(documents) ? documents.length : 0;
    const docsWithStoredText = (documents || []).filter((doc) => String(doc?.extractedText || "").trim()).length;

    return {
      ok: true,
      provider: "none",
      mode: "direct_text_empty",
      reply: {
        role: "assistant",
        content: [
          "No readable stored evidence text is currently available to display.",
          "",
          `Documents on file: ${totalDocs}`,
          `Documents with stored extracted text: ${docsWithStoredText}`,
          "",
          "This usually means extraction failed for the uploaded file, or the text was not stored for that document."
        ].join("\n"),
      },
    };
  }

  const MAX_TOTAL_CHARS = 24000;
  const MAX_PER_DOC_CHARS = 12000;
  let used = 0;
  const lines = [];

  lines.push("Stored extracted evidence text");
  lines.push("");

  selected.forEach((doc, idx) => {
    const fullText = String(doc?.extractedText || "").trim();
    if (!fullText) return;

    const remaining = Math.max(0, MAX_TOTAL_CHARS - used);
    if (remaining <= 0) return;

    const allowed = Math.min(MAX_PER_DOC_CHARS, remaining);
    const text = fullText.length > allowed ? `${fullText.slice(0, allowed)}\n\n[TRUNCATED — ask for continuation]` : fullText;

    lines.push(`${idx + 1}. ${doc.name || "Untitled document"}`);
    lines.push(text);
    lines.push("");

    used += text.length;
  });

  return {
    ok: true,
    provider: "none",
    mode: "direct_text",
    reply: {
      role: "assistant",
      content: lines.join("\n").trim(),
    },
  };
}

function formatSnippetBlock(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return "";

  const lines = [];
  lines.push("RETRIEVED_DOCUMENT_EVIDENCE:");
  lines.push("");

  hits.forEach((h, idx) => {
    lines.push(`[#${idx + 1}] ${h.docName} — section ${h.chunkIndex + 1}`);
    lines.push(h.text.length > 1400 ? `${h.text.slice(0, 1400)}…` : h.text);
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

function normalizeClientDocuments(rows) {
  const list = Array.isArray(rows) ? rows : [];

  return list.map((row, idx) => ({
    docId: String(row?.docId || row?.id || `client-doc-${idx}`),
    caseId: String(row?.caseId || ""),
    name: String(row?.name || row?.filename || "Untitled document"),
    size: Number(row?.size || 0),
    mimeType: String(row?.mimeType || ""),
    uploadedAt: String(row?.uploadedAt || ""),
    docType: String(row?.docType || row?.type || ""),
    exhibitDescription: String(row?.exhibitDescription || ""),
    evidenceCategory: String(row?.evidenceCategory || ""),
    evidenceSupports: Array.isArray(row?.evidenceSupports) ? row.evidenceSupports : [],
    extractedText: String(row?.extractedText || ""),
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

function retrieveFromChunkRows({ chunkRows, query, maxHits = 8 }) {
  const terms = tokenize(query);
  const docIntent = isDocumentAnalysisIntent(query);
  const pluralQuestion = isPluralEvidenceQuestion(query);
  const hits = [];

  for (const row of chunkRows || []) {
    const text = String(row?.chunk_text || "").trim();
    if (!text) continue;

    let score = scoreChunk(text, terms);

    if (docIntent) {
      score += 14;
      if (Number(row?.chunk_index || 0) === 0) score += 8;
    }

    if (pluralQuestion) {
      score += 4;
    }

    if (score <= 0 && !docIntent) continue;
    if (score <= 0 && docIntent) score = 1;

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

  const results = [];
  const perDocCount = new Map();
  const maxPerDoc = pluralQuestion ? 2 : 3;
  const maxTotal = Math.max(1, Math.min(Number(maxHits || 8), 12));

  for (const hit of hits) {
    const current = perDocCount.get(hit.docId) || 0;
    if (current >= maxPerDoc) continue;
    perDocCount.set(hit.docId, current + 1);
    results.push(hit);
    if (results.length >= maxTotal) break;
  }

  return results;
}

function retrieveFromDocsFallback({ documents, query, maxHits = 6 }) {
  const docIntent = isDocumentAnalysisIntent(query);
  if (!docIntent) return [];

  const pluralQuestion = isPluralEvidenceQuestion(query);
  const hits = [];

  for (const doc of documents || []) {
    const text = String(doc?.extractedText || "").trim();
    if (!text) continue;

    const chunks = chunkText(text);
    if (!chunks.length) continue;

    const take = pluralQuestion ? Math.min(2, chunks.length) : 1;

    for (let i = 0; i < take; i += 1) {
      hits.push({
        score: 1,
        docId: doc.docId,
        docName: doc.name || "Untitled document",
        chunkIndex: i,
        text: chunks[i],
        uploadedAt: doc.uploadedAt || "",
      });
    }
  }

  hits.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  return hits.slice(0, Math.max(1, Math.min(Number(maxHits || 6), 10)));
}

function deterministicDocumentAnswer(hits, documents) {
  const totalDocs = Array.isArray(documents) ? documents.length : 0;
  const docsWithExtractedText = (documents || []).filter((d) => String(d?.extractedText || "").trim()).length;

  if (!hits || hits.length === 0) {
    return [
      "I found uploaded documents for this case, but I did not retrieve readable stored text for this question.",
      "",
      `Documents on file: ${totalDocs}`,
      `Documents with stored extracted text: ${docsWithExtractedText}`,
      "",
      "What this means:",
      "• the file may be uploaded but the extraction step did not produce usable text",
      "• or extracted text was stored but no retrievable chunk was available for this question",
      "",
      "Next test:",
      "• re-upload one text PDF",
      "• ask: summarize all uploaded documents",
      "• if the answer is still empty, the failure is in extraction or chunk storage, not the AI model"
    ].join("\n");
  }

  const uniqueDocs = [];
  const seen = new Set();

  for (const hit of hits) {
    if (seen.has(hit.docId)) continue;
    seen.add(hit.docId);
    uniqueDocs.push(hit);
  }

  const lines = [];
  lines.push("What the uploaded evidence appears to include");
  lines.push("");

  uniqueDocs.slice(0, 4).forEach((hit, idx) => {
    lines.push(`${idx + 1}. ${hit.docName}`);
    lines.push(hit.text.length > 1200 ? `${hit.text.slice(0, 1200)}…` : hit.text);
    lines.push("");
  });

  return lines.join("\n").trim();
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

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
    const docIntent = isDocumentAnalysisIntent(lastUser);
    const wantsDirectText = isDirectExtractedTextIntent(lastUser);

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

    if (classification.type === "admin" && !docIntent && isAdminIntent(lastUser)) {
      return json({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.admin },
      });
    }

    const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
    const clientCaseSnapshot =
      body.caseSnapshot && typeof body.caseSnapshot === "object" ? body.caseSnapshot : null;
    const clientDocuments = normalizeClientDocuments(body.documents);

    const serverLoaded = caseId
      ? await loadServerCaseAndDocs(caseId)
      : { caseSnapshot: null, documents: [], chunks: [] };

    const caseSnapshot = serverLoaded.caseSnapshot || clientCaseSnapshot || null;
    const documents =
      Array.isArray(serverLoaded.documents) && serverLoaded.documents.length > 0
        ? serverLoaded.documents
        : clientDocuments;

    if (wantsDirectText) {
      return json(buildDirectTextResponse(documents, lastUser));
    }

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

    let hits = retrieveFromChunkRows({
      chunkRows: serverLoaded.chunks,
      query: lastUser,
      maxHits: 8,
    });

    if (hits.length === 0) {
      hits = retrieveFromDocsFallback({ documents, query: lastUser, maxHits: 6 });
    }

    const snippetBlock = formatSnippetBlock(hits);

    const cfg = getAIConfig();
    const provider = cfg?.provider || "none";
    const liveAI = isLiveAIEnabled(cfg);
    const killSwitchOn = isKillSwitchEnabled();

    if (docIntent && (!killSwitchOn || !liveAI || provider !== "openai")) {
      return json({
        ok: true,
        provider: "none",
        mode: "document_deterministic",
        reply: {
          role: "assistant",
          content: deterministicDocumentAnswer(hits, documents),
        },
      });
    }

    if (!killSwitchOn || !liveAI || provider !== "openai") {
      const fallback = snippetBlock
        ? `Stored document evidence is available.\n\n${snippetBlock}`
        : "Stored document evidence is not currently available in the active chat context.";

      return json({
        ok: true,
        provider: "none",
        mode: "deterministic",
        reply: { role: "assistant", content: fallback },
      });
    }

    const apiKey = cfg.openai.apiKey;
    const model = cfg.openai.model || "gpt-4o-mini";
    const timeoutMs = cfg.openai.timeoutMs || 20000;

    const system = `
You are THOXIE, a California small-claims decision-support assistant.
You are not a lawyer and do not provide legal advice.
Stay on-topic: California small claims only.

If the user asks about uploaded documents, files, exhibits, or evidence:
- use the retrieved document evidence below
- synthesize across multiple retrieved documents when more than one is present
- do not limit the answer to only the file name
- do not say that you cannot read, extract, open, or access files directly
- if no retrieved document evidence is present, say that no readable stored evidence text was retrieved for this question
- do not speculate that a file is corrupted or unreadable unless the retrieved evidence explicitly shows that
- start document answers with: "What the uploaded evidence appears to include"

If the user refers to one uploaded document but multiple retrieved documents are present, explain the most recent/highest-ranked one first and then mention the others if relevant.

Output style:
- short headings
- concrete language
- evidence-first answers
- if multiple documents are retrieved, organize them by document name

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
      return json({
        ok: true,
        provider: "none",
        mode: "document_deterministic_fallback",
        reply: {
          role: "assistant",
          content: deterministicDocumentAnswer(hits, documents),
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




