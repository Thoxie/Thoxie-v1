// Path: /app/_lib/rag/extractText.js

import { RAG_LIMITS } from "./limits";

/**
 * Phase-1 text extraction.
 *
 * Supported inputs:
 *  - text (preferred): already-extracted plain text
 *  - base64: base64-encoded bytes for supported file types
 *
 * Phase-1 supported file types:
 *  - Text-like files (utf-8 decoded)
 *  - DOCX (server-side parse; NO OCR)
 *
 * Not supported yet:
 *  - PDF text extraction (Phase-2)
 *  - images / scanned-document OCR
 *
 * This is intentionally conservative:
 *  - no logging of document contents
 *  - hard caps on bytes/chars
 */
export async function extractTextFromPayload({ mimeType, name, text, base64 }) {
  const mt = String(mimeType || "").trim().toLowerCase();
  const filename = String(name || "").trim().toLowerCase();
  const hasText = typeof text === "string" && text.trim().length > 0;

  // 1) If caller already provided text, accept it.
  if (hasText) {
    const clipped = clipToLimit(text);
    return { ok: true, method: "text", text: clipped };
  }

  const b64 = typeof base64 === "string" ? base64.trim() : "";
  if (!b64) {
    return { ok: false, method: "none", text: "", reason: "no_content" };
  }

  // Hard cap (bytes) to avoid huge server payload processing.
  // Note: base64 expands ~4/3, so bytes ~= (len * 3/4)
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > RAG_LIMITS.maxBase64BytesPerDoc) {
    return { ok: false, method: "base64", text: "", reason: "too_large" };
  }

  // 2) DOCX: parse server-side from base64 bytes.
  if (isDocx(mt, filename)) {
    try {
      const buffer = Buffer.from(b64, "base64");
      const extracted = await extractDocxText(buffer);
      const cleaned = normalize(extracted);

      if (!cleaned.trim()) {
        return { ok: false, method: "docx", text: "", reason: "empty" };
      }

      const clipped = clipToLimit(cleaned);
      return { ok: true, method: "docx", text: clipped };
    } catch {
      return { ok: false, method: "docx", text: "", reason: "parse_error" };
    }
  }

  // 3) Text-like files: decode as utf8.
  if (!isTextLikeMime(mt, filename)) {
    return { ok: false, method: "base64", text: "", reason: "unsupported_mime" };
  }

  try {
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    const cleaned = normalize(decoded);

    if (!cleaned.trim()) {
      return { ok: false, method: "base64", text: "", reason: "empty" };
    }

    const clipped = clipToLimit(cleaned);
    return { ok: true, method: "base64", text: clipped };
  } catch {
    return { ok: false, method: "base64", text: "", reason: "decode_error" };
  }
}

async function extractDocxText(buffer) {
  // Mammoth is a small, purpose-built DOCX extractor.
  // Dynamic import keeps it server-only and avoids bundling into client code.
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return String(result?.value || "");
}

function normalize(s) {
  return String(s || "").replace(/\r\n/g, "\n");
}

function clipToLimit(s) {
  const t = normalize(s);
  if (t.length <= RAG_LIMITS.maxCharsPerDoc) return t;
  return t.slice(0, RAG_LIMITS.maxCharsPerDoc);
}

function isDocx(mt, filename) {
  if (filename.endsWith(".docx")) return true;
  if (!mt) return false;

  if (mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return true;
  if (mt.includes("officedocument.wordprocessingml.document")) return true;

  // Some environments mis-label DOCX as msword/word
  if (mt.includes("application/msword")) return true;
  if (mt.includes("wordprocessingml")) return true;
  if (mt.includes("word")) return true;

  return false;
}

function isTextLikeMime(mt, filename) {
  // Some uploads omit mimeType; use extension as a fallback for known text types.
  if (!mt) return isTextExtension(filename);

  if (mt.startsWith("text/")) return true;
  if (mt === "application/json") return true;
  if (mt === "application/xml") return true;
  if (mt === "application/xhtml+xml") return true;
  if (mt === "application/x-www-form-urlencoded") return true;

  if (mt.includes("markdown")) return true;
  if (mt.includes("csv")) return true;

  // Do NOT treat PDF as text-like in Phase-1
  if (mt.includes("pdf")) return false;

  // DOCX handled separately
  if (mt.includes("word")) return false;
  if (mt.includes("officedocument")) return false;

  return false;
}

function isTextExtension(filename) {
  const f = String(filename || "").toLowerCase();
  return (
    f.endsWith(".txt") ||
    f.endsWith(".md") ||
    f.endsWith(".csv") ||
    f.endsWith(".json") ||
    f.endsWith(".xml") ||
    f.endsWith(".yaml") ||
    f.endsWith(".yml") ||
    f.endsWith(".log")
  );
}
