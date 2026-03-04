// Path: /app/_lib/rag/extractText.js

import { RAG_LIMITS } from "./limits";
import { extractTextFromBuffer } from "../documents/extractText";

/**
 * RAG ingest extraction.
 *
 * Supported inputs:
 *  - d.text (preferred): already-extracted plain text
 *  - d.base64: base64-encoded bytes for:
 *      - DOCX
 *      - PDF (text layer)
 *      - Images (OCR; guarded)
 *      - Text-like (UTF-8 decode)
 *
 * Privacy: do not log contents.
 */
export async function extractTextFromPayload({ mimeType, name, text, base64 }) {
  const mt = String(mimeType || "").trim();
  const filename = String(name || "").trim();

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

  // 2) If this is text-like, decode base64 as UTF-8 (fast path)
  const mtLower = mt.toLowerCase();
  const fnLower = filename.toLowerCase();
  if (isTextLikeMime(mtLower, fnLower)) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const cleaned = normalize(decoded);
      if (!cleaned.trim()) return { ok: false, method: "base64", text: "", reason: "empty" };
      return { ok: true, method: "base64", text: clipToLimit(cleaned) };
    } catch {
      return { ok: false, method: "base64", text: "", reason: "decode_error" };
    }
  }

  // 3) Otherwise attempt server extraction (DOCX / PDF / Image OCR)
  try {
    const buffer = Buffer.from(b64, "base64");
    const ex = await extractTextFromBuffer({
      buffer,
      mimeType: mtLower,
      filename: fnLower,
      limits: {
        maxBytes: RAG_LIMITS.maxBase64BytesPerDoc, // align caps
        ocrTimeoutMs: 12_000
      },
      maxChars: RAG_LIMITS.maxCharsPerDoc
    });

    if (!ex.ok || !String(ex.text || "").trim()) {
      return { ok: false, method: ex.method || "none", text: "", reason: ex.reason || "empty" };
    }

    const cleaned = normalize(ex.text);
    if (!cleaned.trim()) return { ok: false, method: ex.method, text: "", reason: "empty" };
    return { ok: true, method: ex.method, text: clipToLimit(cleaned) };
  } catch {
    return { ok: false, method: "none", text: "", reason: "parse_error" };
  }
}

function normalize(s) {
  return String(s || "").replace(/\r\n/g, "\n");
}

function clipToLimit(s) {
  const t = normalize(s);
  if (t.length <= RAG_LIMITS.maxCharsPerDoc) return t;
  return t.slice(0, RAG_LIMITS.maxCharsPerDoc);
}

function isTextLikeMime(mt, filename) {
  if (!mt) return isTextExtension(filename);
  if (mt.startsWith("text/")) return true;
  if (mt === "application/json") return true;
  if (mt === "application/xml") return true;
  if (mt.includes("markdown")) return true;
  if (mt.includes("csv")) return true;
  if (mt.includes("json")) return true;
  if (mt.includes("xml")) return true;

  return isTextExtension(filename);
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
