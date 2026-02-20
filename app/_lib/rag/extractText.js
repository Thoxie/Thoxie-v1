// Path: /app/_lib/rag/extractText.js

import { RAG_LIMITS } from "./limits";

/**
 * Phase-1 text extraction.
 * Supported inputs:
 *  - d.text (preferred): already-extracted plain text
 *  - d.base64: base64-encoded bytes we treat as UTF-8 text (for text-like files only)
 *
 * Not supported yet:
 *  - PDF OCR
 *  - DOCX parsing
 *  - image text extraction
 *
 * This is intentionally conservative: we only accept text-like content to avoid
 * confusing "it synced but didn't work" behavior for scanned PDFs, etc.
 */
export function extractTextFromPayload({ mimeType, text, base64 }) {
  const mt = String(mimeType || "").trim().toLowerCase();
  const hasText = typeof text === "string" && text.trim().length > 0;

  // 1) If caller already provided text, accept it.
  if (hasText) {
    const clipped = clipToLimit(text);
    return { ok: true, method: "text", text: clipped };
  }

  // 2) If caller provided base64, only accept if mime looks text-like.
  const b64 = typeof base64 === "string" ? base64.trim() : "";
  if (b64) {
    if (!isTextLikeMime(mt)) {
      return { ok: false, method: "base64", text: "", reason: "unsupported_mime" };
    }

    // Hard cap (bytes) to avoid huge server payload processing.
    // Note: base64 expands ~4/3, so bytes ~= (len * 3/4)
    const approxBytes = Math.floor((b64.length * 3) / 4);
    if (approxBytes > RAG_LIMITS.maxBase64BytesPerDoc) {
      return { ok: false, method: "base64", text: "", reason: "too_large" };
    }

    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const cleaned = normalize(decoded);

      if (!cleaned.trim()) {
        return { ok: false, method: "base64", text: "", reason: "empty" };
      }

      const clipped = clipToLimit(cleaned);
      return { ok: true, method: "base64", text: clipped };
    } catch (e) {
      return { ok: false, method: "base64", text: "", reason: "decode_error" };
    }
  }

  return { ok: false, method: "none", text: "", reason: "no_content" };
}

function normalize(s) {
  return String(s || "").replace(/\r\n/g, "\n");
}

function clipToLimit(s) {
  const t = normalize(s);
  if (t.length <= RAG_LIMITS.maxCharsPerDoc) return t;
  return t.slice(0, RAG_LIMITS.maxCharsPerDoc);
}

function isTextLikeMime(mt) {
  if (!mt) return false;

  // Clear text types
  if (mt.startsWith("text/")) return true;

  // Common “text-like” application types
  if (mt === "application/json") return true;
  if (mt === "application/xml") return true;
  if (mt === "application/xhtml+xml") return true;
  if (mt === "application/x-www-form-urlencoded") return true;

  // Some systems label markdown/csv oddly:
  if (mt.includes("markdown")) return true;
  if (mt.includes("csv")) return true;

  // Do NOT treat PDF/DOCX as text-like in Phase-1
  if (mt.includes("pdf")) return false;
  if (mt.includes("word")) return false;
  if (mt.includes("officedocument")) return false;

  return false;
}
