/* FULL PATH: app/_lib/documents/extractText.js */
/* FILE NAME: extractText.js */
/* ACTION: OVERWRITE */

// PATH: app/_lib/documents/extractText.js
// FILE: extractText.js
// ACTION: FULL OVERWRITE

import "pdf2json";
import { extractImageBufferText, extractScannedPdfText } from "./pdfOcr";

const DEFAULT_LIMITS = {
  maxBytes: 8_000_000,
  ocrTimeoutMs: 20_000,
};

function logExtractDiagnostic(event, payload = {}) {
  const line = {
    scope: "extractText",
    event,
    ...payload,
  };

  console.info("UPLOAD_DIAGNOSTIC", JSON.stringify(line));
}

function s(value) {
  return typeof value === "string" ? value.trim() : "";
}

function lower(value) {
  return s(value).toLowerCase();
}

function stripNullBytes(value) {
  return String(value || "").replace(/\u0000/g, "");
}

function normalizeText(value) {
  return stripNullBytes(String(value || ""))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clip(text, maxChars) {
  const normalized = normalizeText(text);
  if (!maxChars || normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars).trim();
}

function cleanReason(error, fallback = "parse_error") {
  const raw = String(error?.message || error || "").trim();
  if (!raw) return fallback;

  const cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, 180);

  return cleaned || fallback;
}

function extensionOf(filename) {
  const fn = lower(filename);
  const idx = fn.lastIndexOf(".");
  return idx >= 0 ? fn.slice(idx) : "";
}

function isLegacyWordDoc(mimeType, filename) {
  const mt = lower(mimeType);
  const ext = extensionOf(filename);
  return ext === ".doc" || mt === "application/msword" || mt.includes("msword");
}

function isDocx(mimeType, filename) {
  const mt = lower(mimeType);
  const ext = extensionOf(filename);

  return (
    ext === ".docx" ||
    mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mt.includes("officedocument.wordprocessingml.document") ||
    mt.includes("wordprocessingml")
  );
}

function isPdf(mimeType, filename) {
  const mt = lower(mimeType);
  const ext = extensionOf(filename);
  return ext === ".pdf" || mt === "application/pdf" || mt.includes("pdf");
}

function isImage(mimeType, filename) {
  const mt = lower(mimeType);
  const ext = extensionOf(filename);

  return (
    mt.startsWith("image/") ||
    ext === ".png" ||
    ext === ".jpg" ||
    ext === ".jpeg" ||
    ext === ".webp" ||
    ext === ".bmp" ||
    ext === ".gif" ||
    ext === ".tif" ||
    ext === ".tiff"
  );
}

function isOcrSupportedImage(mimeType, filename) {
  const mt = lower(mimeType);
  const ext = extensionOf(filename);

  return (
    mt === "image/png" ||
    mt === "image/jpeg" ||
    mt === "image/jpg" ||
    mt === "image/webp" ||
    mt === "image/bmp" ||
    mt === "image/tiff" ||
    ext === ".png" ||
    ext === ".jpg" ||
    ext === ".jpeg" ||
    ext === ".webp" ||
    ext === ".bmp" ||
    ext === ".tif" ||
    ext === ".tiff"
  );
}

function htmlToText(html) {
  const raw = String(html || "");
  if (!raw.trim()) return "";

  return normalizeText(
    raw
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<\/(p|div|section|article|li|tr|table|blockquote|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
  );
}

function uniqueNonEmptyLines(text) {
  const seen = new Set();
  const out = [];

  for (const raw of String(text || "").split("\n")) {
    const line = normalizeText(raw);
    if (!line) continue;

    const key = line.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(line);
  }

  return out;
}

function mergeTextCandidates(candidates, maxChars) {
  const lines = [];
  let runningLength = 0;

  for (const candidate of candidates || []) {
    const candidateLines = uniqueNonEmptyLines(candidate);

    for (const line of candidateLines) {
      lines.push(line);
      runningLength += line.length + 1;

      if (maxChars && runningLength >= maxChars) {
        return clip(lines.join("\n"), maxChars);
      }
    }
  }

  return clip(lines.join("\n"), maxChars);
}

/**
 * Treat tiny/junk parser output as unusable so scanned PDFs fall through to OCR.
 * Keep this conservative so real text PDFs continue to pass.
 */
function isTrivialPdfText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return true;

  const compact = normalized.replace(/\s+/g, "").replace(/[\u0000-\u001F\u007F]/g, "");
  if (!compact) return true;

  if (normalized.length < 40) return true;

  const alnumOnly = compact.replace(/[^A-Za-z0-9]/g, "");
  if (alnumOnly.length < 20) return true;

  const uniqueChars = new Set(compact.toLowerCase().split("")).size;
  if (uniqueChars < 8) return true;

  return false;
}

async function withTimeout(promise, ms, label = "timeout") {
  let timer = null;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadMammothModule() {
  try {
    return await import("mammoth");
  } catch (error) {
    return { __loadError: error };
  }
}

function resolveMammothApi(moduleNs) {
  const candidates = [moduleNs, moduleNs?.default].filter(Boolean);
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate.extractRawText === "function" &&
      typeof candidate.convertToHtml === "function"
    ) {
      return candidate;
    }
  }
  return null;
}

async function extractDocxText(buffer, maxChars) {
  const mammothModule = await loadMammothModule();

  if (mammothModule?.__loadError) {
    return {
      ok: false,
      method: "docx",
      text: "",
      reason: `missing_parser:${cleanReason(mammothModule.__loadError, "mammoth_load_failed")}`,
    };
  }

  const mammoth = resolveMammothApi(mammothModule);
  if (!mammoth) {
    return {
      ok: false,
      method: "docx",
      text: "",
      reason: "missing_parser:mammoth_api_unavailable",
    };
  }

  try {
    const rawResult =
      typeof mammoth.extractRawText === "function"
        ? await mammoth.extractRawText({ buffer }).catch(() => null)
        : null;

    const htmlResult =
      typeof mammoth.convertToHtml === "function"
        ? await mammoth.convertToHtml({ buffer }).catch(() => null)
        : null;

    const rawText = clip(rawResult?.value || "", maxChars);
    const htmlText = clip(htmlToText(htmlResult?.value || ""), maxChars);
    const merged = mergeTextCandidates([htmlText, rawText], maxChars);

    if (!merged.trim()) {
      return { ok: false, method: "docx", text: "", reason: "empty" };
    }

    return { ok: true, method: "docx", text: merged };
  } catch (error) {
    return {
      ok: false,
      method: "docx",
      text: "",
      reason: `parse_error:${cleanReason(error)}`,
    };
  }
}

async function extractPdfTextWithPdfParse(buffer, maxChars) {
  try {
    const moduleNs = await import("pdf-parse");
    const pdfParse = moduleNs?.default || moduleNs;

    if (typeof pdfParse !== "function") {
      return {
        ok: false,
        method: "pdf-parse",
        text: "",
        reason: "missing_parser:pdf_parse_api_unavailable",
      };
    }

    const parsed = await pdfParse(buffer);
    const text = clip(parsed?.text || "", maxChars);

    if (!text.trim() || isTrivialPdfText(text)) {
      return {
        ok: false,
        method: "pdf-parse",
        text: "",
        reason: "empty_pdf_text_layer",
      };
    }

    return {
      ok: true,
      method: "pdf-parse",
      text,
    };
  } catch (error) {
    return {
      ok: false,
      method: "pdf-parse",
      text: "",
      reason: `parse_error:${cleanReason(error, "pdf_parse_failed")}`,
    };
  }
}

async function loadPdf2JsonClass() {
  try {
    const moduleNs = await import("pdf2json");

    const PDFParser =
      moduleNs?.default ||
      moduleNs?.PDFParser ||
      moduleNs?.default?.PDFParser ||
      moduleNs;

    if (typeof PDFParser !== "function") {
      return {
        ok: false,
        reason: "missing_parser:pdf2json_class_unavailable",
      };
    }

    return { ok: true, PDFParser };
  } catch (error) {
    return {
      ok: false,
      reason: `missing_parser:${cleanReason(error, "pdf2json_load_failed")}`,
    };
  }
}

async function extractPdfTextWithPdf2Json(buffer, maxChars) {
  const loaded = await loadPdf2JsonClass();

  if (!loaded.ok || typeof loaded.PDFParser !== "function") {
    return {
      ok: false,
      method: "pdf2json",
      text: "",
      reason: loaded.reason || "missing_parser:pdf2json_class_unavailable",
    };
  }

  return await new Promise((resolve) => {
    let settled = false;
    const parser = new loaded.PDFParser(undefined, 1);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    parser.on("pdfParser_dataError", (err) => {
      finish({
        ok: false,
        method: "pdf2json",
        text: "",
        reason: `parse_error:${cleanReason(
          err?.parserError || err,
          "pdf2json_data_error"
        )}`,
      });
    });

    parser.on("pdfParser_dataReady", () => {
      try {
        const rawText =
          typeof parser.getRawTextContent === "function"
            ? parser.getRawTextContent()
            : "";

        const text = clip(rawText || "", maxChars);

        if (!text.trim() || isTrivialPdfText(text)) {
          finish({
            ok: false,
            method: "pdf2json",
            text: "",
            reason: "empty_pdf_text_layer",
          });
          return;
        }

        finish({
          ok: true,
          method: "pdf2json",
          text,
        });
      } catch (error) {
        finish({
          ok: false,
          method: "pdf2json",
          text: "",
          reason: `parse_error:${cleanReason(error, "pdf2json_ready_error")}`,
        });
      }
    });

    try {
      parser.parseBuffer(buffer);
    } catch (error) {
      finish({
        ok: false,
        method: "pdf2json",
        text: "",
        reason: `parse_error:${cleanReason(error, "pdf2json_parse_buffer_failed")}`,
      });
    }
  });
}

async function extractImageText(buffer, maxChars, limits, mimeType, filename) {
  if (!isOcrSupportedImage(mimeType, filename)) {
    return { ok: false, method: "ocr", text: "", reason: "unsupported_mime" };
  }

  return await extractImageBufferText({
    buffer,
    mimeType,
    maxChars,
  });
}

async function extractPdfText(buffer, maxChars, limits, filename) {
  const primary = await extractPdfTextWithPdfParse(buffer, maxChars);
  if (primary?.ok && String(primary.text || "").trim()) {
    return primary;
  }

  const secondary = await extractPdfTextWithPdf2Json(buffer, maxChars);
  if (secondary?.ok && String(secondary.text || "").trim()) {
    return secondary;
  }

  const emptyTextLayerDetected =
    String(primary?.reason || "") === "empty_pdf_text_layer" ||
    String(secondary?.reason || "") === "empty_pdf_text_layer";

  if (emptyTextLayerDetected) {
    const scannedPdfResult = await extractScannedPdfText({
      buffer,
      maxChars,
      ocrPageImage: async ({ imageBuffer, pageNumber, maxChars: remainingChars }) => {
        return await extractImageText(
          imageBuffer,
          remainingChars,
          limits,
          "image/png",
          `${filename || "document"}#page-${pageNumber}.png`
        );
      },
    });

    if (scannedPdfResult?.ok && String(scannedPdfResult.text || "").trim()) {
      return scannedPdfResult;
    }

    if (String(scannedPdfResult?.reason || "") === "empty_pdf_ocr") {
      return {
        ok: false,
        method: scannedPdfResult?.method || "ocr",
        text: "",
        reason: "empty_pdf_text_layer",
      };
    }

    if (scannedPdfResult?.reason) {
      return scannedPdfResult;
    }

    return {
      ok: false,
      method: scannedPdfResult?.method || secondary?.method || primary?.method || "pdf",
      text: "",
      reason: "empty_pdf_text_layer",
    };
  }

  return secondary?.reason
    ? secondary
    : primary?.reason
      ? primary
      : {
          ok: false,
          method: "pdf",
          text: "",
          reason: "parse_error:pdf_extraction_failed",
        };
}

export async function extractTextFromBuffer({
  buffer,
  mimeType,
  filename,
  limits = DEFAULT_LIMITS,
  maxChars = 180_000,
}) {
  const detectedMime = String(mimeType || "").trim().toLowerCase() || "application/octet-stream";
  const safeFilename = String(filename || "").trim() || "(unnamed)";

  if (!buffer) {
    logExtractDiagnostic("extract_failed", {
      file: safeFilename,
      mime: detectedMime,
      extraction_method: "none",
      text_length: 0,
      reason: "no_buffer",
    });

    return { ok: false, method: "none", text: "", reason: "no_buffer" };
  }

  const size = Buffer.byteLength(buffer);
  if (limits?.maxBytes && size > limits.maxBytes) {
    logExtractDiagnostic("extract_failed", {
      file: safeFilename,
      mime: detectedMime,
      extraction_method: "none",
      text_length: 0,
      reason: "too_large",
      size_bytes: size,
    });

    return { ok: false, method: "none", text: "", reason: "too_large" };
  }

  if (isLegacyWordDoc(mimeType, filename)) {
    logExtractDiagnostic("extract_failed", {
      file: safeFilename,
      mime: detectedMime,
      extraction_method: "doc",
      text_length: 0,
      reason: "unsupported_legacy_word_doc",
      size_bytes: size,
    });

    return {
      ok: false,
      method: "doc",
      text: "",
      reason: "unsupported_legacy_word_doc",
    };
  }

  let result = null;

  if (isDocx(mimeType, filename)) {
    result = await extractDocxText(buffer, maxChars);
  } else if (isPdf(mimeType, filename)) {
    result = await extractPdfText(buffer, maxChars, limits, safeFilename);
  } else if (isImage(mimeType, filename)) {
    result = await extractImageText(buffer, maxChars, limits, mimeType, filename);
  } else {
    result = { ok: false, method: "none", text: "", reason: "unsupported_mime" };
  }

  logExtractDiagnostic(result?.ok ? "extract_succeeded" : "extract_failed", {
    file: safeFilename,
    mime: detectedMime,
    extraction_method: result?.method || "none",
    text_length: String(result?.text || "").length,
    reason: result?.reason || null,
    size_bytes: size,
  });

  return result;
}
::contentReference[oaicite:1]{index=1}
