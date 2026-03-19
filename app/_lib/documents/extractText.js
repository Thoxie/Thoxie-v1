/* FULL PATH: app/_lib/documents/extractText.js */
/* FILE NAME: extractText.js */
/* ACTION: OVERWRITE */

// PATH: app/_lib/documents/extractText.js
// FILE: extractText.js
// ACTION: FULL OVERWRITE

import { extractScannedPdfText } from "./pdfOcr";

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
    ext === ".png" ||
    ext === ".jpg" ||
    ext === ".jpeg" ||
    ext === ".webp" ||
    ext === ".bmp"
  );
}

function readTextBuffer(buffer) {
  try {
    return normalizeText(Buffer.from(buffer).toString("utf8"));
  } catch (error) {
    return "";
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

async function importOptionalModule(specifier) {
  try {
    return await import(specifier);
  } catch (error) {
    return { __loadError: error };
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
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    const text = clip(result?.value || "", maxChars);
    if (!text) {
      return {
        ok: false,
        method: "docx",
        text: "",
        reason: "empty",
      };
    }

    return {
      ok: true,
      method: "docx",
      text,
      meta: {
        warnings: Array.isArray(result?.messages) ? result.messages : [],
      },
    };
  } catch (error) {
    return {
      ok: false,
      method: "docx",
      text: "",
      reason: `parse_error:${cleanReason(error, "mammoth_parse_failed")}`,
    };
  }
}

function resolvePdfParse(moduleNs) {
  const candidates = [moduleNs, moduleNs?.default].filter(Boolean);
  for (const candidate of candidates) {
    if (typeof candidate === "function") return candidate;
    if (candidate && typeof candidate.default === "function") return candidate.default;
  }
  return null;
}

async function extractPdfTextViaPdfParse(buffer, maxChars) {
  try {
    const moduleNs = await import("pdf-parse");
    const pdfParse = resolvePdfParse(moduleNs);

    if (!pdfParse) {
      return {
        ok: false,
        method: "pdf-parse",
        text: "",
        reason: "missing_parser:pdf_parse_api_unavailable",
      };
    }

    const result = await pdfParse(Buffer.from(buffer));
    const text = clip(result?.text || "", maxChars);

    if (!text) {
      return {
        ok: false,
        method: "pdf-parse",
        text: "",
        reason: "empty_pdf_text_layer",
        meta: {
          numpages: Number(result?.numpages || 0),
          info: result?.info || null,
        },
      };
    }

    return {
      ok: true,
      method: "pdf-parse",
      text,
      meta: {
        numpages: Number(result?.numpages || 0),
        info: result?.info || null,
      },
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

function resolvePdf2JsonClass(moduleNs) {
  const candidates = [moduleNs, moduleNs?.default].filter(Boolean);
  for (const candidate of candidates) {
    if (typeof candidate === "function") return candidate;
    if (candidate && typeof candidate.PDFParser === "function") return candidate.PDFParser;
    if (candidate && typeof candidate.default === "function") return candidate.default;
    if (candidate?.default && typeof candidate.default.PDFParser === "function") {
      return candidate.default.PDFParser;
    }
  }
  return null;
}

async function loadPdf2JsonClass() {
  try {
    const moduleNs = await importOptionalModule("pdf2json");
    if (moduleNs?.__loadError) {
      return {
        ok: false,
        reason: `missing_parser:${cleanReason(moduleNs.__loadError, "pdf2json_load_failed")}`,
        PdfParser: null,
      };
    }

    const PdfParser = resolvePdf2JsonClass(moduleNs);
    if (!PdfParser) {
      return {
        ok: false,
        reason: "missing_parser:pdf2json_class_unavailable",
        PdfParser: null,
      };
    }

    return {
      ok: true,
      reason: "",
      PdfParser,
    };
  } catch (error) {
    return {
      ok: false,
      reason: `missing_parser:${cleanReason(error, "pdf2json_load_failed")}`,
      PdfParser: null,
    };
  }
}

function flattenPdf2JsonText(data) {
  const pages = Array.isArray(data?.Pages) ? data.Pages : [];
  const parts = [];

  for (const page of pages) {
    const texts = Array.isArray(page?.Texts) ? page.Texts : [];
    for (const textEntry of texts) {
      const runs = Array.isArray(textEntry?.R) ? textEntry.R : [];
      const decoded = runs
        .map((run) => {
          const raw = typeof run?.T === "string" ? run.T : "";
          try {
            return decodeURIComponent(raw);
          } catch {
            return raw;
          }
        })
        .join(" ")
        .trim();

      if (decoded) parts.push(decoded);
    }
  }

  return normalizeText(parts.join("\n"));
}

async function extractPdfTextViaPdf2Json(buffer, maxChars) {
  const loaded = await loadPdf2JsonClass();
  if (!loaded.ok || !loaded.PdfParser) {
    return {
      ok: false,
      method: "pdf2json",
      text: "",
      reason: loaded.reason || "missing_parser:pdf2json_class_unavailable",
    };
  }

  const PdfParser = loaded.PdfParser;

  return await new Promise((resolve) => {
    let settled = false;

    function finish(payload) {
      if (settled) return;
      settled = true;
      resolve(payload);
    }

    try {
      const parser = new PdfParser(null, 1);

      parser.on("pdfParser_dataError", (error) => {
        finish({
          ok: false,
          method: "pdf2json",
          text: "",
          reason: `parse_error:${cleanReason(
            error?.parserError || error,
            "pdf2json_data_error"
          )}`,
        });
      });

      parser.on("pdfParser_dataReady", (data) => {
        try {
          const text = clip(flattenPdf2JsonText(data), maxChars);
          if (!text) {
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
        parser.parseBuffer(Buffer.from(buffer));
      } catch (error) {
        finish({
          ok: false,
          method: "pdf2json",
          text: "",
          reason: `parse_error:${cleanReason(error, "pdf2json_parse_buffer_failed")}`,
        });
      }
    } catch (error) {
      finish({
        ok: false,
        method: "pdf2json",
        text: "",
        reason: `parse_error:${cleanReason(error, "pdf2json_construct_failed")}`,
      });
    }
  });
}

async function extractPdfText(buffer, filename, maxChars, options = {}) {
  const primary = await extractPdfTextViaPdfParse(buffer, maxChars);
  if (primary.ok) return primary;

  if (primary.reason !== "empty_pdf_text_layer") {
    const fallback = await extractPdfTextViaPdf2Json(buffer, maxChars);
    if (fallback.ok) return fallback;

    if (options.allowOcrFallback !== false) {
      const ocr = await extractScannedPdfText({
        buffer,
        filename,
        maxChars,
        timeoutMs: Number(options.ocrTimeoutMs || DEFAULT_LIMITS.ocrTimeoutMs),
      });

      if (ocr?.ok) {
        return {
          ok: true,
          method: ocr.method || "pdf_ocr",
          text: clip(ocr.text || "", maxChars),
          meta: ocr.meta || null,
        };
      }
    }

    return fallback;
  }

  if (options.allowOcrFallback === false) {
    return primary;
  }

  const ocr = await extractScannedPdfText({
    buffer,
    filename,
    maxChars,
    timeoutMs: Number(options.ocrTimeoutMs || DEFAULT_LIMITS.ocrTimeoutMs),
  });

  if (ocr?.ok) {
    return {
      ok: true,
      method: ocr.method || "pdf_ocr",
      text: clip(ocr.text || "", maxChars),
      meta: ocr.meta || null,
    };
  }

  return primary;
}

async function extractImageText(buffer, filename, mimeType, maxChars, options = {}) {
  if (!isOcrSupportedImage(mimeType, filename)) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: "unsupported_mime",
    };
  }

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const job = worker.recognize(Buffer.from(buffer));
    const result = await withTimeout(
      job,
      Number(options.ocrTimeoutMs || DEFAULT_LIMITS.ocrTimeoutMs),
      "ocr_timeout"
    );
    await worker.terminate();

    const text = clip(result?.data?.text || "", maxChars);
    if (!text) {
      return {
        ok: false,
        method: "ocr",
        text: "",
        reason: "empty",
      };
    }

    return {
      ok: true,
      method: "ocr",
      text,
    };
  } catch (error) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `parse_error:${cleanReason(error, "ocr_failed")}`,
    };
  }
}

export async function extractTextFromBuffer({
  buffer,
  mimeType = "",
  filename = "",
  maxChars = 180_000,
  maxBytes = DEFAULT_LIMITS.maxBytes,
  allowOcrFallback = true,
  ocrTimeoutMs = DEFAULT_LIMITS.ocrTimeoutMs,
} = {}) {
  const sizeBytes = Number(buffer?.byteLength || buffer?.length || 0);

  logExtractDiagnostic("extract_start", {
    filename: s(filename),
    mimeType: s(mimeType),
    sizeBytes,
    maxChars,
    allowOcrFallback: !!allowOcrFallback,
  });

  if (!buffer || sizeBytes <= 0) {
    return {
      ok: false,
      method: "none",
      text: "",
      reason: "empty",
    };
  }

  if (sizeBytes > Number(maxBytes || DEFAULT_LIMITS.maxBytes)) {
    return {
      ok: false,
      method: "none",
      text: "",
      reason: "too_large",
    };
  }

  if (isLegacyWordDoc(mimeType, filename)) {
    return {
      ok: false,
      method: "legacy_word",
      text: "",
      reason: "unsupported_legacy_word_doc",
    };
  }

  if (isDocx(mimeType, filename)) {
    const result = await extractDocxText(buffer, maxChars);
    logExtractDiagnostic("extract_finish", {
      filename: s(filename),
      mimeType: s(mimeType),
      method: result.method,
      ok: !!result.ok,
      reason: result.reason || "",
      textLength: Number(result.text?.length || 0),
    });
    return result;
  }

  if (isPdf(mimeType, filename)) {
    const result = await extractPdfText(buffer, filename, maxChars, {
      allowOcrFallback,
      ocrTimeoutMs,
    });

    logExtractDiagnostic("extract_finish", {
      filename: s(filename),
      mimeType: s(mimeType),
      method: result.method,
      ok: !!result.ok,
      reason: result.reason || "",
      textLength: Number(result.text?.length || 0),
    });

    return result;
  }

  if (isImage(mimeType, filename)) {
    const result = await extractImageText(buffer, filename, mimeType, maxChars, {
      ocrTimeoutMs,
    });

    logExtractDiagnostic("extract_finish", {
      filename: s(filename),
      mimeType: s(mimeType),
      method: result.method,
      ok: !!result.ok,
      reason: result.reason || "",
      textLength: Number(result.text?.length || 0),
    });

    return result;
  }

  const plainText = clip(readTextBuffer(buffer), maxChars);
  if (plainText) {
    const result = {
      ok: true,
      method: "text",
      text: plainText,
    };

    logExtractDiagnostic("extract_finish", {
      filename: s(filename),
      mimeType: s(mimeType),
      method: result.method,
      ok: true,
      reason: "",
      textLength: Number(result.text?.length || 0),
    });

    return result;
  }

  const failure = {
    ok: false,
    method: "none",
    text: "",
    reason: "unsupported_mime",
  };

  logExtractDiagnostic("extract_finish", {
    filename: s(filename),
    mimeType: s(mimeType),
    method: failure.method,
    ok: false,
    reason: failure.reason,
    textLength: 0,
  });

  return failure;
}
