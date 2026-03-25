/* FULL PATH: app/_lib/documents/extractText.js */
/* FILE NAME: extractText.js */
/* ACTION: OVERWRITE */

import "pdf2json";
import { extractScannedPdfText } from "./pdfOcr";

const DEFAULT_LIMITS = {
  maxBytes: 8_000_000,
  // Increased to reduce timeouts in serverless OCR
  ocrTimeoutMs: 60_000,
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

async function downscaleImage(buffer) {
  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule?.default || sharpModule;

    return await sharp(buffer)
      .resize({ width: 1800, withoutEnlargement: true })
      .grayscale()
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    // If sharp is unavailable, fall back to original buffer
    return buffer;
  }
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

async function extractImageText(buffer, maxChars, limits, mimeType, filename) {
  if (!isOcrSupportedImage(mimeType, filename)) {
    return { ok: false, method: "ocr", text: "", reason: "unsupported_mime" };
  }

  try {
    const tesseractModule = await import("tesseract.js");
    const Tesseract = tesseractModule?.default || tesseractModule;

    // Downscale before OCR for speed and reliability
    const processedBuffer = await downscaleImage(buffer);

    const result = await withTimeout(
      Tesseract.recognize(processedBuffer, "eng"),
      Number(limits?.ocrTimeoutMs || DEFAULT_LIMITS.ocrTimeoutMs),
      "ocr_timeout"
    );

    const text = clip(result?.data?.text || "", maxChars);

    if (!text.trim()) {
      return { ok: false, method: "ocr", text: "", reason: "empty" };
    }

    return { ok: true, method: "ocr", text };
  } catch (error) {
    const msg = String(error?.message || "");
    if (msg.includes("ocr_timeout")) {
      return { ok: false, method: "ocr", text: "", reason: "timeout" };
    }

    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `parse_error:${cleanReason(error)}`,
    };
  }
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



