/* 2. PATH: app/_lib/rag/extractText.js */
/* 2. FILE: extractText.js */
/* 2. ACTION: OVERWRITE */

import { RAG_LIMITS } from "./limits";
import { extractTextFromBuffer } from "../documents/extractText";

function stripNullBytes(value) {
  return String(value || "").replace(/\u0000/g, "");
}

function normalize(value) {
  return stripNullBytes(String(value || ""))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function clipToLimit(value) {
  const text = normalize(value);
  if (text.length <= RAG_LIMITS.maxCharsPerDoc) return text;
  return text.slice(0, RAG_LIMITS.maxCharsPerDoc).trim();
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

function isBinaryDocument(mt, filename) {
  const mime = String(mt || "").toLowerCase();
  const fn = String(filename || "").toLowerCase();

  return (
    fn.endsWith(".docx") ||
    fn.endsWith(".pdf") ||
    /\.(png|jpg|jpeg|webp)$/.test(fn) ||
    mime.includes("wordprocessingml") ||
    mime.includes("pdf") ||
    mime.startsWith("image/")
  );
}

function chooseBetterText(parsedText, suppliedText) {
  const a = clipToLimit(parsedText || "");
  const b = clipToLimit(suppliedText || "");

  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;

  return a.length >= b.length ? a : b;
}

export async function extractTextFromPayload({ mimeType, name, text, base64 }) {
  const mt = String(mimeType || "").trim();
  const filename = String(name || "").trim();
  const suppliedText = typeof text === "string" ? clipToLimit(text) : "";

  const b64 = typeof base64 === "string" ? base64.trim() : "";
  if (!b64) {
    if (suppliedText.trim()) {
      return { ok: true, method: "text", text: suppliedText };
    }
    return { ok: false, method: "none", text: "", reason: "no_content" };
  }

  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > RAG_LIMITS.maxBase64BytesPerDoc) {
    return { ok: false, method: "base64", text: "", reason: "too_large" };
  }

  const mtLower = mt.toLowerCase();
  const fnLower = filename.toLowerCase();

  if (isBinaryDocument(mtLower, fnLower)) {
    try {
      const buffer = Buffer.from(b64, "base64");

      const extracted = await extractTextFromBuffer({
        buffer,
        mimeType: mtLower,
        filename: fnLower,
        limits: {
          maxBytes: RAG_LIMITS.maxBase64BytesPerDoc,
          ocrTimeoutMs: 20_000,
        },
        maxChars: RAG_LIMITS.maxCharsPerDoc,
      });

      if (extracted.ok && String(extracted.text || "").trim()) {
        return {
          ok: true,
          method: extracted.method || "unknown",
          text: clipToLimit(extracted.text),
        };
      }

      if (suppliedText.trim()) {
        return {
          ok: true,
          method: "text_fallback",
          text: suppliedText,
        };
      }

      return {
        ok: false,
        method: extracted.method || "none",
        text: "",
        reason: extracted.reason || "empty",
      };
    } catch {
      if (suppliedText.trim()) {
        return { ok: true, method: "text_fallback", text: suppliedText };
      }
      return { ok: false, method: "none", text: "", reason: "parse_error" };
    }
  }

  if (isTextLikeMime(mtLower, fnLower)) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const best = chooseBetterText(decoded, suppliedText);

      if (!best.trim()) {
        return { ok: false, method: "base64", text: "", reason: "empty" };
      }

      return { ok: true, method: "base64", text: best };
    } catch {
      if (suppliedText.trim()) {
        return { ok: true, method: "text", text: suppliedText };
      }
      return { ok: false, method: "base64", text: "", reason: "decode_error" };
    }
  }

  if (suppliedText.trim()) {
    return { ok: true, method: "text", text: suppliedText };
  }

  return { ok: false, method: "none", text: "", reason: "unsupported_mime" };
}
