// Path: /app/_lib/rag/extractText.js

import { RAG_LIMITS } from "./limits";

/**
 * Phase-1 text extraction.
 * Supported inputs:
 *  - d.text (preferred): already-extracted plain text
 *  - d.base64: base64-encoded bytes for:
 *      - text-like files (UTF-8 decode)
 *      - DOCX (server-side parse; NO OCR)
 *
 * Not supported yet:
 *  - PDF text extraction (Phase-2)
 *  - image / scanned document OCR
 *
 * Privacy: do not log contents.
 */
export async function extractTextFromPayload({ mimeType, name, text, base64 }) {
  const mt = String(mimeType || "").trim().toLowerCase();
  const filename = String(name || "").trim().toLowerCase();

  // 1) If caller already provided text, accept it.
  if (typeof text === "string" && text.trim()) {
    return { ok: true, method: "text", text: clipToLimit(text) };
  }

  const b64 = typeof base64 === "string" ? base64.trim() : "";
  if (!b64) return { ok: false, method: "none", text: "", reason: "no_content" };

  // Hard cap per doc (approx bytes) to avoid runaway payloads
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > RAG_LIMITS.maxBase64BytesPerDoc) {
    return { ok: false, method: "base64", text: "", reason: "too_large" };
  }

  // 2) DOCX: parse via mammoth (server-side)
  if (isDocx(mt, filename)) {
    try {
      const buffer = Buffer.from(b64, "base64");
      const extracted = await extractDocxText(buffer);
      const cleaned = normalize(extracted);
      if (!cleaned.trim()) return { ok: false, method: "docx", text: "", reason: "empty" };
      return { ok: true, method: "docx", text: clipToLimit(cleaned) };
    } catch {
      return { ok: false, method: "docx", text: "", reason: "parse_error" };
    }
  }

  // 3) Text-like: decode base64 as UTF-8
  if (!isTextLikeMime(mt, filename)) {
    return { ok: false, method: "base64", text: "", reason: "unsupported_mime" };
  }

  try {
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    const cleaned = normalize(decoded);
    if (!cleaned.trim()) return { ok: false, method: "base64", text: "", reason: "empty" };
    return { ok: true, method: "base64", text: clipToLimit(cleaned) };
  } catch {
    return { ok: false, method: "base64", text: "", reason: "decode_error" };
  }
}

async function extractDocxText(buffer) {
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
  if (mt.includes("wordprocessingml")) return true;
  if (mt.includes("application/msword")) return true; // sometimes mis-labeled
  if (mt.includes("word")) return true;
  return false;
}

function isTextLikeMime(mt, filename) {
  if (!mt) return isTextExtension(filename);
  if (mt.startsWith("text/")) return true;
  if (mt === "application/json") return true;
  if (mt === "application/xml") return true;
  if (mt.includes("markdown")) return true;
  if (mt.includes("csv")) return true;

  // Not Phase-1
  if (mt.includes("pdf")) return false;
  if (mt.includes("word") || mt.includes("officedocument")) return false;

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
