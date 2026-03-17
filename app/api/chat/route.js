/* PATH: app/api/chat/route.js */
/* FILE: route.js */
/* ACTION: FULL OVERWRITE */

import { NextResponse } from "next/server";
import { getPool } from "../../_lib/server/db";
import { ensureSchema } from "../../_lib/server/ensureSchema";
import { getAIConfig, isLiveAIEnabled } from "../../_lib/ai/server/aiConfig";
import { buildChatContext } from "../../_lib/ai/server/buildChatContext";
import { analyzeEvidencePacket } from "../../_lib/ai/server/analyzeEvidencePacket";
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
    .slice(0, 24);
}

function countOccurrences(text, token) {
  if (!text || !token) return 0;
  return text.split(token).length - 1;
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function scoreChunk(chunk, terms, query = "") {
  const text = String(chunk || "");
  const lower = text.toLowerCase();
  const lowerQuery = String(query || "").toLowerCase();
  let score = 0;

  for (const t of terms) {
    const hits = countOccurrences(lower, t);
    if (hits > 0) score += Math.min(12, hits) * 3;
  }

  score += Math.max(0, 6 - Math.floor(lower.length / 450));

  if (/^\s*(superior court|state of california|county of|case\s+(no\.?|number))/im.test(text)) {
    score += 8;
  }

  if (hasAny(lower, [/\bplaintiff\b/, /\bdefendant\b/, /\bpetitioner\b/, /\brespondent\b/])) {
    score += 6;
  }

  if (
    hasAny(lower, [
      /\brequest(?:s|ed)? that\b/,
      /\brelief requested\b/,
      /\bprayer for relief\b/,
      /\basks? the court to\b/,
      /\bseeks?\b/,
      /\bmove(?:s|d)? the court\b/,
    ])
  ) {
    score += 9;
  }

  if (
    hasAny(lower, [
      /\bexhibit\s+[a-z0-9]+\b/,
      /\battachment\s+[a-z0-9]+\b/,
      /\bappendix\s+[a-z0-9]+\b/,
      /\bsee attached\b/,
    ])
  ) {
    score += 7;
  }

  if (
    hasAny(lower, [
      /\bcode of civil procedure\b/,
      /\bcivil code\b/,
      /\bevidence code\b/,
      /\bfamily code\b/,
      /\bgovernment code\b/,
      /\bbusiness\s*&\s*professions code\b/,
      /§{1,2}\s*\d/,
      /\bsection\s+\d/,
      /\bstatute\b/,
      /\brule\s+\d/,
    ])
  ) {
    score += 8;
  }

  if (/^\s*(?:[ivxlcdm]+\.\s+|\d+\.\s+|[a-z]\.\s+)/im.test(text) || /^\s*\(?\d{1,3}[.)]\s+/m.test(text)) {
    score += 5;
  }

  if (
    hasAny(lower, [
      /\bdeclaration of\b/,
      /\bmemorandum of points and authorities\b/,
      /\brequest for order\b/,
      /\bcomplaint\b/,
      /\bopposition\b/,
      /\breply\b/,
      /\bproof of service\b/,
      /\bmotion\b/,
    ])
  ) {
    score += 5;
  }

  if (lowerQuery) {
    if (lowerQuery.includes("contradiction") || lowerQuery.includes("inconsistent") || lowerQuery.includes("conflict")) {
      if (hasAny(lower, [/\bhowever\b/, /\bbut\b/, /\balthough\b/, /\bdespite\b/, /\binconsistent\b/, /\bcontradict/i])) {
        score += 5;
      }
    }

    if (lowerQuery.includes("timeline") || lowerQuery.includes("chronology") || lowerQuery.includes("when")) {
      if (hasAny(lower, [/\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b/i, /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, /\b\d{4}-\d{2}-\d{2}\b/])) {
        score += 5;
      }
    }

    if (lowerQuery.includes("amount") || lowerQuery.includes("damages") || lowerQuery.includes("cost") || lowerQuery.includes("money")) {
      if (/\$\s?\d[\d,]*(?:\.\d{2})?/i.test(text)) {
        score += 5;
      }
    }
  }

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

function isDraftingIntent(query) {
  const q = String(query || "").toLowerCase();
  if (!q) return false;

  return (
    q.includes("draft ") ||
    q.includes("write ") ||
    q.includes("prepare ") ||
    q.includes("create ") ||
    q.includes("generate ") ||
    q.includes("make ") ||
    q.includes("demand letter") ||
    q.includes("letter") ||
    q.includes("declaration") ||
    q.includes("response") ||
    q.includes("motion") ||
    q.includes("email") ||
    q.includes("notice")
  );
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

function buildChunkWindowFromRows(rows, index, radius = 2) {
  const current = rows[index];
  if (!current) return "";

  const currentDocId = current.doc_id;
  const parts = [];

  for (let offset = -radius; offset <= radius; offset += 1) {
    const row = rows[index + offset];
    if (!row || row.doc_id !== currentDocId) continue;
    const value = String(row.chunk_text || "").trim();
    if (value) parts.push(value);
  }

  return parts.join("\n").trim();
}

function buildChunkWindowFromArray(chunks, index, radius = 2) {
  const parts = [];

  for (let offset = -radius; offset <= radius; offset += 1) {
    const value = String(chunks[index + offset] || "").trim();
    if (value) parts.push(value);
  }

  return parts.join("\n").trim();
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

function buildCitationLabel(hit) {
  const docName = String(hit?.docName || "Untitled document").trim();
  const chunkIndex = Number(hit?.chunkIndex || 0);
  return `${docName} §${chunkIndex + 1}`;
}

function formatSnippetBlock(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return "";

  const lines = [];
  lines.push("RETRIEVED_DOCUMENT_EVIDENCE:");
  lines.push("");

  hits.forEach((h, idx) => {
    const citation = h.citationLabel || buildCitationLabel(h);
    lines.push(`[#${idx + 1}] ${citation}`);
    lines.push(h.text.length > 1600 ? `${h.text.slice(0, 1600)}…` : h.text);
    lines.push("");
  });

  return lines.join("\n").trim();
}

function summarizeEvidenceFacts(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return [];

  const sentences = [];
  const seen = new Set();

  for (const hit of hits) {
    const raw = String(hit?.text || "");
    const parts = raw
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (part.length < 40) continue;
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      sentences.push({
        text: part,
        docName: hit.docName,
        citationLabel: hit.citationLabel || buildCitationLabel(hit),
      });
      if (sentences.length >= 10) {
        return sentences;
      }
    }
  }

  return sentences;
}

function formatEvidenceFactBlock(hits) {
  const facts = summarizeEvidenceFacts(hits);
  if (facts.length === 0) return "";

  const lines = [];
  lines.push("DOCUMENT_FACTS_TO_USE:");
  lines.push("");

  facts.forEach((fact, idx) => {
    lines.push(`${idx + 1}. [${fact.citationLabel || fact.docName}] ${fact.text}`);
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
    chunkCount: Number(row.chunk_count || 0),
    readableByAI: String(row.extracted_text || "").trim().length > 0 && Number(row.chunk_count || 0) > 0,
    extractionMethod: row.extraction_method || "",
    ocrStatus: row.ocr_status || "",
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
    chunkCount: Number(row?.chunkCount || 0),
    readableByAI: !!row?.readableByAI,
    extractionMethod: String(row?.extractionMethod || ""),
    ocrStatus: String(row?.ocrStatus || ""),
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
      d.doc_id,
      d.case_id,
      d.name,
      d.mime_type,
      d.size_bytes,
      d.doc_type,
      d.exhibit_description,
      d.evidence_category,
      d.evidence_supports,
      d.blob_url,
      d.uploaded_at,
      d.extracted_text,
      d.extraction_method,
      d.ocr_status,
      coalesce(c.chunk_count, 0) as chunk_count
    from thoxie_document d
    left join (
      select doc_id, count(*) as chunk_count
      from thoxie_document_chunk
      group by doc_id
    ) c
      on c.doc_id = d.doc_id
    where d.case_id = $1
    order by d.uploaded_at desc, d.name asc
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
  const rows = Array.isArray(chunkRows) ? chunkRows : [];
  const terms = tokenize(query);
  const docIntent = isDocumentAnalysisIntent(query) || isDraftingIntent(query);
  const pluralQuestion = isPluralEvidenceQuestion(query);
  const hits = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const text = String(row?.chunk_text || "").trim();
    if (!text) continue;

    let score = scoreChunk(text, terms, query);
    score += scoreDocumentNameMatch(row?.doc_name, query);

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
      citationLabel: `${row.doc_name || "Untitled document"} §${Number(row.chunk_index || 0) + 1}`,
      text: buildChunkWindowFromRows(rows, i, 2),
      uploadedAt: row.uploaded_at || "",
    });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (String(b.uploadedAt) !== String(a.uploadedAt)) {
      return String(b.uploadedAt).localeCompare(String(a.uploadedAt));
    }
    if (a.docId !== b.docId) return String(a.docId).localeCompare(String(b.docId));
    return a.chunkIndex - b.chunkIndex;
  });

  const results = [];
  const perDocCount = new Map();
  const seenWindows = new Set();
  const maxPerDoc = pluralQuestion ? 3 : docIntent ? 4 : 3;
  const maxTotal = Math.max(1, Math.min(Number(maxHits || 8), 12));

  for (const hit of hits) {
    const windowKey = `${hit.docId}:${hit.chunkIndex}`;
    if (seenWindows.has(windowKey)) continue;
    seenWindows.add(windowKey);

    const current = perDocCount.get(hit.docId) || 0;
    if (current >= maxPerDoc) continue;
    perDocCount.set(hit.docId, current + 1);
    results.push(hit);
    if (results.length >= maxTotal) break;
  }

  return results;
}

function retrieveFromDocsFallback({ documents, query, maxHits = 6 }) {
  const docIntent = isDocumentAnalysisIntent(query) || isDraftingIntent(query);
  if (!docIntent) return [];

  const pluralQuestion = isPluralEvidenceQuestion(query);
  const hits = [];

  for (const doc of documents || []) {
    const text = String(doc?.extractedText || "").trim();
    if (!text) continue;

    const chunks = chunkText(text);
    if (!chunks.length) continue;

    const nameBoost = scoreDocumentNameMatch(doc?.name, query);
    const take = pluralQuestion ? Math.min(3, chunks.length) : Math.min(3, chunks.length);

    for (let i = 0; i < take; i += 1) {
      hits.push({
        score: 1 + nameBoost + (i === 0 ? 2 : 0),
        docId: doc.docId,
        docName: doc.name || "Untitled document",
        chunkIndex: i,
        citationLabel: `${doc.name || "Untitled document"} §${i + 1}`,
        text: buildChunkWindowFromArray(chunks, i, 2),
        uploadedAt: doc.uploadedAt || "",
      });
    }
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(b.uploadedAt).localeCompare(String(a.uploadedAt));
  });
  return hits.slice(0, Math.max(1, Math.min(Number(maxHits || 6), 10)));
}

function deterministicDocumentAnswer(hits, documents, evidencePacket) {
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

  const lines = [];
  lines.push("What the uploaded evidence appears to include");
  lines.push("");

  const facts = Array.isArray(evidencePacket?.factBullets) ? evidencePacket.factBullets : [];
  facts.slice(0, 6).forEach((fact, idx) => {
    lines.push(`${idx + 1}. ${fact}`);
  });

  if (Array.isArray(evidencePacket?.gaps) && evidencePacket.gaps.length > 0) {
    lines.push("");
    lines.push("Potential gaps or weak points visible in the retrieved evidence");
    evidencePacket.gaps.slice(0, 4).forEach((gap, idx) => {
      lines.push(`${idx + 1}. ${gap}`);
    });
  }

  if (Array.isArray(evidencePacket?.authorities) && evidencePacket.authorities.length > 0) {
    lines.push("");
    lines.push("Authorities already detected in the uploaded evidence");
    evidencePacket.authorities.slice(0, 6).forEach((authority, idx) => {
      lines.push(`${idx + 1}. ${authority}`);
    });
  }

  if (Array.isArray(hits) && hits.length > 0) {
    lines.push("");
    lines.push("Grounding references");
    hits.slice(0, 6).forEach((hit, idx) => {
      lines.push(`${idx + 1}. ${hit.citationLabel || buildCitationLabel(hit)}`);
    });
  }

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
    const docIntent = isDocumentAnalysisIntent(lastUser) || isDraftingIntent(lastUser);
    const wantsDirectText = isDirectExtractedTextIntent(lastUser);
    const wantsDrafting = isDraftingIntent(lastUser);

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
      maxHits: wantsDrafting ? 10 : 8,
    });

    if (hits.length === 0) {
      hits = retrieveFromDocsFallback({ documents, query: lastUser, maxHits: wantsDrafting ? 8 : 6 });
    }

    const snippetBlock = formatSnippetBlock(hits);
    const evidenceFactBlock = formatEvidenceFactBlock(hits);
    const evidencePacket = analyzeEvidencePacket({ query: lastUser, hits, documents });
    const evidencePacketBlock = evidencePacket?.packetText || "";

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
          content: deterministicDocumentAnswer(hits, documents, evidencePacket),
        },
      });
    }

    if (!killSwitchOn || !liveAI || provider !== "openai") {
      const fallback = snippetBlock
        ? `Stored document evidence is available.\n\n${evidencePacketBlock}\n\n${snippetBlock}`
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

You must use a two-stage evidence workflow.
Stage 1: review the evidence packet and retrieved snippets.
Stage 2: answer the user's question only after identifying the strongest facts, authorities, omissions, and tensions shown in that evidence.

Rules for uploaded-document reasoning:
- use the evidence packet below as the primary reasoning surface
- use the retrieved snippets to verify wording and context
- when retrieved document evidence conflicts with case summary context, follow the retrieved document evidence
- do not invent facts that do not appear in the retrieved evidence
- do not produce a generic template when retrieved evidence is present
- if the user asks for weaknesses, missing arguments, missing statutes, contradictions, or improvements, do not refuse merely because the document does not literally describe its own weaknesses
- identify weaknesses from omissions, thin factual support, limited citation support, missing amounts, missing dates, and weak linkage between facts and requested relief when those problems are visible in the evidence
- separate authorities already in the evidence from candidate authorities to verify
- do not fabricate case holdings or quote statutes not actually provided unless you label them as candidate authorities to verify
- if no retrieved document evidence is present, say that no readable stored evidence text was retrieved for this question
- do not speculate that a file is corrupted or unreadable unless the evidence or diagnostics explicitly show that
- cite concrete factual assertions inline using bracketed grounding references like [Document Name §N] when the retrieved evidence supports the assertion
- prefer the exact grounding references already supplied in the evidence packet and retrieved snippet blocks

If the user asks for drafting based on a document:
- start with a short heading: "Document-grounded draft"
- after that, include a short section called "Facts used from the uploaded document"
- list 3 to 8 concrete facts taken from the evidence packet
- cite those facts inline using [Document Name §N] where available
- then provide the draft
- separate facts, law, damages, and requested relief when applicable
- keep placeholders only where the document does not supply the missing information

If the user asks about uploaded documents more generally:
- start document answers with: "What the uploaded evidence appears to include"

Output style:
- short headings
- concrete language
- evidence-first answers
- if multiple documents are retrieved, organize them by document name
- when discussing weaknesses, use bullets or numbered items
- when suggesting statutes or rules, use a subsection titled "Candidate authorities to verify"

Context:
${contextText}

${evidencePacketBlock ? `\n\n${evidencePacketBlock}\n` : ""}

${evidenceFactBlock ? `\n\n${evidenceFactBlock}\n` : ""}

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
          content: deterministicDocumentAnswer(hits, documents, evidencePacket),
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

