// Path: /app/_lib/documents/extractText.js

/**
 * Server-side Document Text Extraction (beta)
 *
 * Supported:
 * - DOCX (mammoth)
 * - PDF (pdf-parse: text layer only)
 * - Images (tesseract.js OCR) — guarded + capped
 */

import * as pdfParse from "pdf-parse";

const DEFAULT_LIMITS = {
  maxBytes: 2_000_000,
  ocrTimeoutMs: 12_000,
};

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function lower(v) {
  return s(v).toLowerCase();
}

function isDocx(mimeType, filename) {
  const mt = lower(mimeType);
  const fn = lower(filename);
  return (
    fn.endsWith(".docx") ||
    mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mt.includes("officedocument.wordprocessingml.document") ||
    mt.includes("wordprocessingml")
  );
}

function isPdf(mimeType, filename) {
  const mt = lower(mimeType);
  const fn = lower(filename);
  return fn.endsWith(".pdf") || mt === "application/pdf" || mt.includes("pdf");
}

function isImage(mimeType, filename) {
  const mt = lower(mimeType);
  const fn = lower(filename);
  return (
    mt.startsWith("image/") ||
    fn.endsWith(".png") ||
    fn.endsWith(".jpg") ||
    fn.endsWith(".jpeg") ||
    fn.endsWith(".webp")
  );
}

function clip(text, maxChars) {
  const t = String(text || "").replace(/\r\n/g, "\n");
  if (!maxChars || t.length <= maxChars) return t;
  return t.slice(0, maxChars);
}

async function withTimeout(promise, ms, label = "timeout") {
  let t = null;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(label)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

function getPdfParseFn() {
  // Support both export shapes:
  // - module exports a function
  // - module exports { default: fn }
  const fn = (typeof pdfParse === "function" ? pdfParse : null) || pdfParse?.default;
  return typeof fn === "function" ? fn : null;
}

export async function extractTextFromBuffer({
  buffer,
  mimeType,
  filename,
  limits = DEFAULT_LIMITS,
  maxChars = 120_000,
}) {
  if (!buffer) return { ok: false, method: "none", text: "", reason: "no_buffer" };

  const size = Buffer.byteLength(buffer);
  if (limits?.maxBytes && size > limits.maxBytes) {
    return { ok: false, method: "none", text: "", reason: "too_large" };
  }

  // DOCX
  if (isDocx(mimeType, filename)) {
    try {
      const mammoth = await import("mammoth");
      const res = await mammoth.extractRawText({ buffer });
      const text = clip(res?.value || "", maxChars);
      if (!text.trim()) return { ok: false, method: "docx", text: "", reason: "empty" };
      return { ok: true, method: "docx", text };
    } catch {
      return { ok: false, method: "docx", text: "", reason: "parse_error" };
    }
  }

  // PDF
  if (isPdf(mimeType, filename)) {
    try {
      const parse = getPdfParseFn();
      if (!parse) return { ok: false, method: "pdf", text: "", reason: "missing_parser" };
      const data = await parse(buffer);
      const text = clip(data?.text || "", maxChars);
      if (!text.trim()) return { ok: false, method: "pdf", text: "", reason: "empty" };
      return { ok: true, method: "pdf", text };
    } catch {
      return { ok: false, method: "pdf", text: "", reason: "parse_error" };
    }
  }

  // Images (OCR)
  if (isImage(mimeType, filename)) {
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await withTimeout(
        Tesseract.recognize(buffer, "eng"),
        Number(limits?.ocrTimeoutMs || DEFAULT_LIMITS.ocrTimeoutMs),
        "ocr_timeout"
      );
      const text = clip(result?.data?.text || "", maxChars);
      if (!text.trim()) return { ok: false, method: "ocr", text: "", reason: "empty" };
      return { ok: true, method: "ocr", text };
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("ocr_timeout")) return { ok: false, method: "ocr", text: "", reason: "timeout" };
      return { ok: false, method: "ocr", text: "", reason: "parse_error" };
    }
  }

  return { ok: false, method: "none", text: "", reason: "unsupported_mime" };
}
