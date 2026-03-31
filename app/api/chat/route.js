// PATH: /app/api/chat/route.js
// DIRECTORY: /app/api/chat
// FILE: route.js
// ACTION: OVERWRITE ENTIRE FILE

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
import {
  createOwnerToken,
  getOwnerTokenFromRequest,
  hashOwnerToken,
  OWNER_COOKIE_MAX_AGE_SECONDS,
  OWNER_COOKIE_NAME,
} from "../../_lib/server/caseService";

const OWNERSHIP_ERROR_MESSAGE =
  "This case is linked to a different browser session. Open it from the browser that created it.";

function json(data, status = 200, ownerToken = "") {
  const response = NextResponse.json(data, { status });

  if (ownerToken) {
    response.cookies.set({
      name: OWNER_COOKIE_NAME,
      value: ownerToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OWNER_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}

function normalizeCaseId(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

async function readCaseOwnershipRow(caseId) {
  const normalizedCaseId = normalizeCaseId(caseId);
  if (!normalizedCaseId) return null;

  const pool = getPool();
  await ensureSchema(pool);

  const result = await pool.query(
    `
    select case_id, owner_token_hash
    from thoxie_case
    where case_id = $1
    limit 1
    `,
    [normalizedCaseId]
  );

  return result.rows[0] || null;
}

async function authorizeCaseAccess(req, caseId) {
  const normalizedCaseId = normalizeCaseId(caseId);

  if (!normalizedCaseId) {
    return { ok: true, caseId: "", ownerTokenToSet: "" };
  }

  const row = await readCaseOwnershipRow(normalizedCaseId);
  if (!row) {
    return { ok: true, caseId: normalizedCaseId, ownerTokenToSet: "" };
  }

  const rowOwnerHash = normalizeCaseId(row.owner_token_hash).toLowerCase();
  const requestOwnerToken = getOwnerTokenFromRequest(req);
  const requestOwnerHash = hashOwnerToken(requestOwnerToken);

  if (rowOwnerHash) {
    if (!requestOwnerHash || requestOwnerHash !== rowOwnerHash) {
      return {
        ok: false,
        status: 403,
        error: OWNERSHIP_ERROR_MESSAGE,
        ownerTokenToSet: "",
      };
    }

    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet: requestOwnerToken || "",
    };
  }

  const ownerTokenToSet = requestOwnerToken || createOwnerToken();
  const ownerTokenHash = hashOwnerToken(ownerTokenToSet);
  const pool = getPool();
  await ensureSchema(pool);

  const claimResult = await pool.query(
    `
    update thoxie_case
    set
      owner_token_hash = $2,
      owner_claimed_at = coalesce(owner_claimed_at, now()),
      owner_last_seen_at = now()
    where case_id = $1
      and coalesce(owner_token_hash, '') = ''
    returning case_id, owner_token_hash
    `,
    [normalizedCaseId, ownerTokenHash]
  );

  const claimedRow = claimResult.rows[0] || null;
  if (claimedRow) {
    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet,
    };
  }

  const refreshedRow = await readCaseOwnershipRow(normalizedCaseId);
  const refreshedOwnerHash = normalizeCaseId(refreshedRow?.owner_token_hash).toLowerCase();

  if (refreshedOwnerHash && refreshedOwnerHash === ownerTokenHash) {
    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet,
    };
  }

  return {
    ok: false,
    status: 403,
    error: OWNERSHIP_ERROR_MESSAGE,
    ownerTokenToSet: "",
  };
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

function normalizeFlagList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return [];
}

function logChatDiagnostic(payload = {}) {
  console.info(
    "UPLOAD_DIAGNOSTIC",
    JSON.stringify({
      scope: "chatRetrieval",
      ...payload,
    })
  );
}

function classifyLegalIntentProfile(query = "") {
  const q = String(query || "").toLowerCase();

  return {
    wantsContradictions:
      q.includes("contradiction") ||
      q.includes("inconsistent") ||
      q.includes("conflict") ||
      q.includes("undermine") ||
      q.includes("tension"),
    wantsTimeline:
      q.includes("timeline") ||
      q.includes("chronology") ||
      q.includes("sequence") ||
      q.includes("when"),
    wantsDamages:
      q.includes("amount") ||
      q.includes("damages") ||
      q.includes("cost") ||
      q.includes("money") ||
      q.includes("fees") ||
      q.includes("expense"),
    wantsAuthorities:
      q.includes("authority") ||
      q.includes("authorities") ||
      q.includes("statute") ||
      q.includes("code section") ||
      q.includes("case law") ||
      q.includes("legal basis"),
    wantsRelief:
      q.includes("relief") ||
      q.includes("prayer") ||
      q.includes("request") ||
      q.includes("asks the court") ||
      q.includes("seeks"),
    wantsParties:
      q.includes("party") ||
      q.includes("parties") ||
      q.includes("plaintiff") ||
      q.includes("defendant") ||
      q.includes("petitioner") ||
      q.includes("respondent"),
    wantsDraft: isDraftingIntent(q),
  };
}

function scoreValueAgainstTerms(value, queryTerms, weight = 2) {
  const text = String(value || "").toLowerCase();
  if (!text) return 0;

  let score = 0;
  for (const term of queryTerms || []) {
    if (term && text.includes(term)) score += weight;
  }
  return score;
}

function toSupportList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function scoreChunk(chunk, terms, query = "", meta = {}) {
  const text = String(chunk || "");
  const lower = text.toLowerCase();
  const lowerQuery = String(query || "").toLowerCase();
  const flags = new Set(normalizeFlagList(meta.structuralFlags));
  const chunkKind = String(meta.chunkKind || "").toLowerCase();
  const sectionLabel = String(meta.sectionLabel || "");
  const docType = String(meta.docType || "").toLowerCase();
  const evidenceCategory = String(meta.evidenceCategory || "").toLowerCase();
  const exhibitDescription = String(meta.exhibitDescription || "").toLowerCase();
  const evidenceSupports = toSupportList(meta.evidenceSupports);
  const profile = classifyLegalIntentProfile(lowerQuery);

  let score = 0;

  for (const t of terms) {
    const hits = countOccurrences(lower, t);
    if (hits > 0) score += Math.min(12, hits) * 3;
  }

  score += scoreValueAgainstTerms(sectionLabel, terms, 4);
  score += scoreValueAgainstTerms(docType, terms, 5);
  score += scoreValueAgainstTerms(evidenceCategory, terms, 4);
  score += scoreValueAgainstTerms(exhibitDescription, terms, 3);

  for (const support of evidenceSupports) {
    score += scoreValueAgainstTerms(support, terms, 4);
  }

  score += Math.max(0, 6 - Math.floor(lower.length / 450));

  if (/^\s*(superior court|state of california|county of|case\s+(no\.?|number))/im.test(text) || flags.has("caption")) {
    score += 10;
  }

  if (
    hasAny(lower, [/\bplaintiff\b/, /\bdefendant\b/, /\bpetitioner\b/, /\brespondent\b/]) ||
    flags.has("party_roles")
  ) {
    score += 7;
    if (profile.wantsParties) score += 7;
  }

  if (
    hasAny(lower, [
      /\brequest(?:s|ed)? that\b/,
      /\brelief requested\b/,
      /\bprayer for relief\b/,
      /\basks? the court to\b/,
      /\bseeks?\b/,
      /\bmove(?:s|d)? the court\b/,
    ]) ||
    flags.has("relief_language")
  ) {
    score += 10;
    if (profile.wantsRelief || profile.wantsDraft) score += 9;
  }

  if (
    hasAny(lower, [
      /\bexhibit\s+[a-z0-9]+\b/,
      /\battachment\s+[a-z0-9]+\b/,
      /\bappendix\s+[a-z0-9]+\b/,
      /\bsee attached\b/,
    ]) ||
    flags.has("exhibit_marker") ||
    chunkKind === "exhibit"
  ) {
    score += 6;
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
    ]) ||
    flags.has("authority_reference")
  ) {
    score += 9;
    if (profile.wantsAuthorities || profile.wantsDraft) score += 8;
  }

  if (
    /^\s*(?:[ivxlcdm]+\.\s+|\d+\.\s+|[a-z]\.\s+)/im.test(text) ||
    /^\s*\(?\d{1,3}[.)]\s+/m.test(text) ||
    flags.has("structured_numbering") ||
    chunkKind === "numbered_paragraph"
  ) {
    score += 5;
  }

  if (chunkKind === "caption") score += 9;
  if (chunkKind === "heading") score += 8;
  if (chunkKind === "signature") score += 3;
  if (chunkKind === "exhibit") score += 5;

  if (docType === "declaration") score += 6;
  if (docType === "motion" || docType === "memorandum" || docType === "opposition" || docType === "reply") score += 7;
  if (docType === "request_for_order" || docType === "complaint") score += 8;
  if (docType === "email" || docType === "financial_record") score += 4;

  if (evidenceCategory === "filing" || evidenceCategory === "pleading") score += 8;
  if (evidenceCategory === "exhibit" || evidenceCategory === "attachment") score += 4;
  if (evidenceCategory === "correspondence") score += 3;

  if (sectionLabel && lowerQuery) {
    const sectionTerms = tokenize(sectionLabel);
    for (const t of sectionTerms) {
      if (lowerQuery.includes(t)) score += 4;
    }
  }

  if (profile.wantsContradictions) {
    if (hasAny(lower, [/\bhowever\b/, /\bbut\b/, /\balthough\b/, /\bdespite\b/, /\binconsistent\b/, /\bcontradict/i])) {
      score += 6;
    }
  }

  if (profile.wantsTimeline) {
    if (
      hasAny(lower, [
        /\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b/i,
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
        /\b\d{4}-\d{2}-\d{2}\b/,
      ]) ||
      flags.has("date")
    ) {
      score += 7;
    }
  }

  if (profile.wantsDamages) {
    if (/\$\s?\d[\d,]*(?:\.\d{2})?/i.test(text) || flags.has("money")) {
      score += 7;
    }
  }

  if (profile.wantsDraft) {
    if (chunkKind === "heading" || chunkKind === "caption" || flags.has("relief_language") || flags.has("authority_reference")) {
      score += 4;
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

  const wantsReadback =
    q.includes("read back") ||
    q.includes("read it back") ||
    q.includes("read me") ||
    q.includes("read the document") ||
    q.includes("recite") ||
    q.includes("verbatim") ||
    q.includes("word for word") ||
    q.includes("100%");

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
    q.includes("all text") ||
    q.includes("entire document") ||
    q.includes("whole document") ||
    q.includes("complete document") ||
    q.includes("exact text");

  const docReference =
    q.includes("document") ||
    q.includes("documents") ||
    q.includes("docx") ||
    q.includes("file") ||
    q.includes("files") ||
    q.includes("upload") ||
    q.includes("uploaded");

  return (wantsDisplay && wantsStoredText) || (wantsReadback && (wantsStoredText || docReference));
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

function buildChunkWindowFromObjects(chunks, index, radius = 2) {
  const parts = [];

  for (let offset = -radius; offset <= radius; offset += 1) {
    const entry = chunks[index + offset];
    const value = String(entry?.text || "").trim();
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

  return wantsAll ? scored.map((entry) => entry.doc) : [scored[0].doc];
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

  const lines = [];

  lines.push("Stored extracted evidence text from SQL");
  lines.push("");

  selected.forEach((doc, idx) => {
    const fullText = String(doc?.extractedText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (!fullText) return;

    lines.push(`${idx + 1}. ${doc.name || "Untitled document"}`);
    lines.push(fullText);

    if (idx < selected.length - 1) {
      lines.push("");
      lines.push("-----");
      lines.push("");
    }
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
  const chunkLabel = String(hit?.chunkLabel || "").trim();
  const sectionLabel = String(hit?.sectionLabel || "").trim();
  const pageStart = Number(hit?.pageStart);
  const pageEnd = Number(hit?.pageEnd);
  const chunkIndex = Number(hit?.chunkIndex || 0);

  if (chunkLabel) return `${docName} ${chunkLabel}`;
  if (Number.isFinite(pageStart) && Number.isFinite(pageEnd)) {
    return pageStart === pageEnd ? `${docName} p. ${pageStart}` : `${docName} pp. ${pageStart}-${pageEnd}`;
  }
  if (sectionLabel) return `${docName} ${sectionLabel}`;
  return `${docName} §${chunkIndex + 1}`;
}

function formatSnippetBlock(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return "";

  const grouped = new Map();
  for (const hit of hits) {
    const key = String(hit?.docId || hit?.docName || "unknown-doc");
    if (!grouped.has(key)) {
      grouped.set(key, {
        docName: hit?.docName || "Untitled document",
        docType: hit?.docType || "",
        evidenceCategory: hit?.evidenceCategory || "",
        items: [],
      });
    }
    grouped.get(key).items.push(hit);
  }

  const lines = [];
  lines.push("RETRIEVED_DOCUMENT_EVIDENCE:");
  lines.push("");

  Array.from(grouped.values()).forEach((group, groupIndex) => {
    const headerParts = [`${groupIndex + 1}. ${group.docName}`];
    if (group.docType) headerParts.push(`type=${group.docType}`);
    if (group.evidenceCategory) headerParts.push(`category=${group.evidenceCategory}`);
    lines.push(headerParts.join(" | "));

    group.items.forEach((h, idx) => {
      const citation = h.citationLabel || buildCitationLabel(h);
      lines.push(`  [${groupIndex + 1}.${idx + 1}] ${citation}`);
      lines.push(`  ${h.text.length > 1600 ? `${h.text.slice(0, 1600)}…` : h.text}`);
      lines.push("");
    });
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
      c.chunk_kind,
      c.chunk_label,
      c.section_label,
      c.page_start,
      c.page_end,
      c.char_start,
      c.char_end,
      c.structural_flags,
      d.name as doc_name,
      d.uploaded_at,
      d.doc_type,
      d.evidence_category,
      d.evidence_supports,
      d.exhibit_description
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

    let score = scoreChunk(text, terms, query, {
      chunkKind: row?.chunk_kind,
      sectionLabel: row?.section_label,
      structuralFlags: row?.structural_flags,
      docType: row?.doc_type,
      evidenceCategory: row?.evidence_category,
      evidenceSupports: row?.evidence_supports,
      exhibitDescription: row?.exhibit_description,
    });

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
      chunkKind: String(row.chunk_kind || ""),
      chunkLabel: String(row.chunk_label || ""),
      sectionLabel: String(row.section_label || ""),
      pageStart: Number.isFinite(Number(row.page_start)) ? Number(row.page_start) : null,
      pageEnd: Number.isFinite(Number(row.page_end)) ? Number(row.page_end) : null,
      charStart: Number.isFinite(Number(row.char_start)) ? Number(row.char_start) : null,
      charEnd: Number.isFinite(Number(row.char_end)) ? Number(row.char_end) : null,
      structuralFlags: normalizeFlagList(row.structural_flags),
      docType: String(row.doc_type || ""),
      evidenceCategory: String(row.evidence_category || ""),
      evidenceSupports: toSupportList(row.evidence_supports),
      exhibitDescription: String(row.exhibit_description || ""),
      text: buildChunkWindowFromRows(rows, i, 2),
      uploadedAt: row.uploaded_at || "",
    });
  }

  hits.forEach((hit) => {
    hit.citationLabel = buildCitationLabel(hit);
  });

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
  const pluralQuestion = isPluralEvidenceQuestion(query);
  const hits = [];

  for (const doc of documents || []) {
    const text = String(doc?.extractedText || "").trim();
    if (!text) continue;
    const chunks = chunkText(text, { returnObjects: true });
    if (!chunks.length) continue;

    const nameBoost = scoreDocumentNameMatch(doc?.name, query);
    const take = pluralQuestion ? Math.min(3, chunks.length) : Math.min(3, chunks.length);

    for (let i = 0; i < take; i += 1) {
      const chunk = chunks[i];
      hits.push({
        score:
          1 +
          nameBoost +
          (i === 0 ? 2 : 0) +
          scoreChunk(chunk?.text || "", tokenize(query), query, {
            chunkKind: chunk?.chunkKind,
            sectionLabel: chunk?.sectionLabel,
            structuralFlags: chunk?.structuralFlags,
            docType: doc?.docType,
            evidenceCategory: doc?.evidenceCategory,
            evidenceSupports: doc?.evidenceSupports,
            exhibitDescription: doc?.exhibitDescription,
          }),
        docId: doc.docId,
        docName: doc.name || "Untitled document",
        chunkIndex: Number(chunk?.chunkIndex ?? i),
        chunkKind: String(chunk?.chunkKind || ""),
        chunkLabel: String(chunk?.label || ""),
        sectionLabel: String(chunk?.sectionLabel || ""),
        pageStart: Number.isFinite(Number(chunk?.pageStart)) ? Number(chunk.pageStart) : null,
        pageEnd: Number.isFinite(Number(chunk?.pageEnd)) ? Number(chunk.pageEnd) : null,
        charStart: Number.isFinite(Number(chunk?.charStart)) ? Number(chunk.charStart) : null,
        charEnd: Number.isFinite(Number(chunk?.charEnd)) ? Number(chunk.charEnd) : null,
        structuralFlags: normalizeFlagList(chunk?.structuralFlags),
        docType: String(doc.docType || ""),
        evidenceCategory: String(doc.evidenceCategory || ""),
        evidenceSupports: toSupportList(doc.evidenceSupports),
        exhibitDescription: String(doc.exhibitDescription || ""),
        text: buildChunkWindowFromObjects(chunks, i, 2),
        uploadedAt: doc.uploadedAt || "",
      });
    }
  }

  hits.forEach((hit) => {
    hit.citationLabel = buildCitationLabel(hit);
  });

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(b.uploadedAt).localeCompare(String(a.uploadedAt));
  });

  return hits.slice(0, Math.max(1, Math.min(Number(maxHits || 6), 10)));
}

function retrieveFromReadableDocsFinalFallback(documents) {
  const readableDocs = (documents || [])
    .filter((doc) => String(doc?.extractedText || "").trim())
    .sort((a, b) => String(b?.uploadedAt || "").localeCompare(String(a?.uploadedAt || "")));

  if (readableDocs.length === 0) return [];

  const hits = [];

  for (const doc of readableDocs.slice(0, 2)) {
    const text = String(doc?.extractedText || "").trim();
    if (!text) continue;

    const chunks = chunkText(text, { returnObjects: true });
    if (!chunks.length) continue;

    for (let i = 0; i < Math.min(2, chunks.length); i += 1) {
      const chunk = chunks[i];
      hits.push({
        score: 1,
        docId: doc.docId,
        docName: doc.name || "Untitled document",
        chunkIndex: Number(chunk?.chunkIndex ?? i),
        chunkKind: String(chunk?.chunkKind || ""),
        chunkLabel: String(chunk?.label || ""),
        sectionLabel: String(chunk?.sectionLabel || ""),
        pageStart: Number.isFinite(Number(chunk?.pageStart)) ? Number(chunk.pageStart) : null,
        pageEnd: Number.isFinite(Number(chunk?.pageEnd)) ? Number(chunk.pageEnd) : null,
        charStart: Number.isFinite(Number(chunk?.charStart)) ? Number(chunk.charStart) : null,
        charEnd: Number.isFinite(Number(chunk?.charEnd)) ? Number(chunk.charEnd) : null,
        structuralFlags: normalizeFlagList(chunk?.structuralFlags),
        docType: String(doc.docType || ""),
        evidenceCategory: String(doc.evidenceCategory || ""),
        evidenceSupports: toSupportList(doc.evidenceSupports),
        exhibitDescription: String(doc.exhibitDescription || ""),
        text: buildChunkWindowFromObjects(chunks, i, 2),
        uploadedAt: doc.uploadedAt || "",
      });
    }
  }

  hits.forEach((hit) => {
    hit.citationLabel = buildCitationLabel(hit);
  });

  return hits;
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

    const caseId = normalizeCaseId(body.caseId);
    let ownerTokenToSet = "";

    if (caseId) {
      const access = await authorizeCaseAccess(req, caseId);

      if (!access.ok) {
        return json(
          {
            ok: false,
            error: access.error || OWNERSHIP_ERROR_MESSAGE,
            reply: {
              role: "assistant",
              content: access.error || OWNERSHIP_ERROR_MESSAGE,
            },
          },
          access.status || 403
        );
      }

      ownerTokenToSet = access.ownerTokenToSet || "";
    }

    const respond = (data, status = 200) => json(data, status, ownerTokenToSet);

    const msgs = safeMessages(body.messages);
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content || "";
    const docIntent = isDocumentAnalysisIntent(lastUser) || isDraftingIntent(lastUser);
    const wantsDirectText = isDirectExtractedTextIntent(lastUser);
    const wantsDrafting = isDraftingIntent(lastUser);

    const classification = classifyMessage(lastUser);

    if (classification.type === "off_topic") {
      return respond({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.off_topic },
      });
    }

    if (classification.type === "empty") {
      return respond({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.empty },
      });
    }

    if (classification.type === "admin" && !docIntent && isAdminIntent(lastUser)) {
      return respond({
        ok: true,
        provider: "none",
        reply: { role: "assistant", content: GateResponses.admin },
      });
    }

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
      return respond(buildDirectTextResponse(documents, lastUser));
    }

    let contextText = buildChatContext({ caseId, caseSnapshot, documents, query: lastUser });

    if (isReadinessIntent(lastUser)) {
      const readiness = evaluateCASmallClaimsReadiness({ caseSnapshot, documents });
      const readinessText = formatReadinessResponse(readiness);

      return respond({
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

    const docsWithStoredText = documents.filter((d) => String(d?.extractedText || "").trim()).length;

    logChatDiagnostic({
      event: "retrieval_start",
      case_id: caseId,
      query_length: String(lastUser || "").length,
      chunk_rows_available: serverLoaded.chunks.length,
      docs_total: documents.length,
      docs_with_stored_text: docsWithStoredText,
      hits_from_chunks: hits.length,
    });

    if (hits.length === 0) {
      hits = retrieveFromDocsFallback({ documents, query: lastUser, maxHits: wantsDrafting ? 8 : 6 });
      logChatDiagnostic({
        event: "retrieval_docs_fallback",
        case_id: caseId,
        hits_from_docs_fallback: hits.length,
      });
    }

    if (hits.length === 0) {
      hits = retrieveFromReadableDocsFinalFallback(documents);
      logChatDiagnostic({
        event: "retrieval_final_fallback",
        case_id: caseId,
        hits_from_final_fallback: hits.length,
      });
    }

    const snippetBlock = formatSnippetBlock(hits);
    const evidenceFactBlock = formatEvidenceFactBlock(hits);
    const evidencePacket = analyzeEvidencePacket({ query: lastUser, hits, documents });
    const evidencePacketBlock = evidencePacket?.packetText || "";
    contextText = buildChatContext({
      caseId,
      caseSnapshot,
      documents,
      query: lastUser,
      hits,
      evidencePacket,
    });

    const cfg = getAIConfig();
    const provider = cfg?.provider || "none";
    const liveAI = isLiveAIEnabled(cfg);
    const killSwitchOn = isKillSwitchEnabled();

    if (docIntent && (!killSwitchOn || !liveAI || provider !== "openai")) {
      return respond({
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

      return respond({
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

You must follow a structured legal-analysis workflow.

Stage 1: identify what the retrieved evidence actually contains.
Stage 2: separate the material into facts, claims or defenses, requested relief, authorities already present, contradictions, and missing support.
Stage 3: answer the user's question using only grounded material from the retrieved evidence and case context.

Non-negotiable rules:
- use the evidence packet below as the primary reasoning surface
- use the retrieved snippets to verify wording and context
- when retrieved document evidence conflicts with case summary context, follow the retrieved document evidence
- do not invent facts that do not appear in the retrieved evidence
- do not produce a generic template when retrieved evidence is present
- identify weaknesses from omissions, thin factual support, limited citation support, missing amounts, missing dates, and weak linkage between facts and requested relief when those problems are visible in the evidence
- separate authorities already in the evidence from candidate authorities to verify
- do not fabricate case holdings or quote statutes not actually provided unless you label them as candidate authorities to verify
- if no retrieved document evidence is present, say that no readable stored evidence text was retrieved for this question
- do not speculate that a file is corrupted or unreadable unless the evidence or diagnostics explicitly show that
- cite concrete factual assertions inline using bracketed grounding references like [Document Name p. 3], [Document Name Caption], or [Document Name section 4]
- prefer the exact grounding references already supplied in the evidence packet and retrieved snippet blocks
- if page references are missing, fall back to the provided section-style references instead of inventing pages

When legal analysis is requested, organize the answer in this order where relevant:
1. What the uploaded evidence appears to show
2. Strongest facts
3. Claims or defenses supported by the evidence
4. Requested relief or practical objective
5. Contradictions, weak points, or omissions
6. Authorities already in the evidence
7. Candidate authorities to verify
8. Bottom-line assessment

When drafting is requested:
- start with the heading "Document-grounded draft"
- include a short section called "Facts used from the uploaded document"
- list 3 to 8 concrete facts taken from the evidence packet with citations
- then provide the draft
- separate facts, law, damages, and requested relief when applicable
- keep placeholders only where the uploaded material does not supply the missing information

Output style:
- short headings
- concrete language
- evidence-first answers
- organize by document when multiple documents matter
- for contradictions or weaknesses, use bullets or numbering
- be explicit about what is missing versus what is actually shown

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
      return respond({
        ok: true,
        provider: "none",
        mode: "document_deterministic_fallback",
        reply: {
          role: "assistant",
          content: deterministicDocumentAnswer(hits, documents, evidencePacket),
        },
      });
    }

    return respond({
      ok: true,
      provider: "openai",
      mode: "ai",
      reply: { role: "assistant", content: ai.content },
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
    

