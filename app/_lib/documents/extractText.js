// PATH: /app/_lib/documents/extractText.js
// DIRECTORY: /app/_lib/documents
// FILE: extractText.js
// ACTION: OVERWRITE ENTIRE FILE

const DEFAULT_LIMITS = {
  maxBytes: 8_000_000,
  ocrTimeoutMs: 20_000,
  pdfTextTimeoutMs: 15_000,
  allowInlinePdfOcr: false,
  allowPdf2JsonFallback: false,
};

function logExtractDiagnostic(event, payload = {}) {
  console.info(
    "UPLOAD_DIAGNOSTIC",
    JSON.stringify({
      scope: "extractText",
      event,
      ...payload,
    })
  );
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

function normalizeDocxText(value) {
  return stripNullBytes(String(value || ""))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function clip(text, maxChars) {
  const normalized = normalizeText(text);
  if (!maxChars || normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars).trim();
}

function clipDocxText(text, maxChars) {
  const normalized = normalizeDocxText(text);
  if (!maxChars || normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars).trim();
}

function docxTextSignal(text) {
  return normalizeDocxText(text).replace(/\s+/g, "").length;
}

function selectDocxCandidateText(rawText, htmlText) {
  const raw = normalizeDocxText(rawText);
  const html = normalizeDocxText(htmlText);

  const rawSignal = docxTextSignal(raw);
  const htmlSignal = docxTextSignal(html);

  if (!rawSignal) return html;
  if (!htmlSignal) return raw;

  const htmlLooksSubstantiallyMoreComplete =
    htmlSignal >= 1200 &&
    htmlSignal > rawSignal + 1200 &&
    rawSignal < htmlSignal * 0.55;

  return htmlLooksSubstantiallyMoreComplete ? html : raw;
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

function stripPdfPageMarkers(text) {
  return normalizeText(
    String(text || "")
      .replace(/^--\s*\d+\s+of\s+\d+\s*--$/gim, "")
      .replace(/^Page\s+\d+\s+of\s+\d+$/gim, "")
  );
}

function envFlag(name) {
  const value = String(process.env[name] || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function resolveBooleanOption(value, envName, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof envName === "string" && envName) return envFlag(envName);
  return fallback;
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

    const rawText = normalizeDocxText(rawResult?.value || "");
    const htmlText = normalizeDocxText(htmlToText(htmlResult?.value || ""));
    const selected = selectDocxCandidateText(rawText, htmlText);
    const finalText = clipDocxText(selected, maxChars);

    if (!finalText.trim()) {
      return { ok: false, method: "docx", text: "", reason: "empty" };
    }

    return { ok: true, method: "docx", text: finalText };
  } catch (error) {
    return {
      ok: false,
      method: "docx",
      text: "",
      reason: `parse_error:${cleanReason(error)}`,
    };
  }
}

async function loadPdfParseApi() {
  try {
    const workerModule = await import("pdf-parse/worker");
    const CanvasFactory =
      workerModule?.CanvasFactory ||
      workerModule?.default?.CanvasFactory ||
      null;
    const getData = workerModule?.getData || workerModule?.default?.getData || null;
    const getPath = workerModule?.getPath || workerModule?.default?.getPath || null;

    const moduleNs = await import("pdf-parse");
    const PDFParse = moduleNs?.PDFParse || moduleNs?.default?.PDFParse || moduleNs?.default;

    if (typeof PDFParse !== "function") {
      return {
        ok: false,
        reason: "missing_parser:pdf_parse_api_unavailable",
      };
    }

    try {
      if (typeof PDFParse.setWorker === "function") {
        const workerData = typeof getData === "function" ? getData() : null;
        const workerPath = typeof getPath === "function" ? getPath() : null;

        if (workerData) {
          PDFParse.setWorker(workerData);
        } else if (workerPath) {
          PDFParse.setWorker(workerPath);
        }
      }
    } catch {}

    return { ok: true, PDFParse, CanvasFactory };
  } catch (error) {
    return {
      ok: false,
      reason: `missing_parser:${cleanReason(error, "pdf_parse_load_failed")}`,
    };
  }
}

async function extractPdfTextWithPdfParse(buffer, maxChars, limits) {
  const loaded = await loadPdfParseApi();

  if (!loaded.ok || typeof loaded.PDFParse !== "function") {
    return {
      ok: false,
      method: "pdf-parse",
      text: "",
      reason: loaded.reason || "missing_parser:pdf_parse_api_unavailable",
    };
  }

  let parser = null;

  try {
    const parserOptions = { data: buffer };

    if (loaded.CanvasFactory) {
      parserOptions.CanvasFactory = loaded.CanvasFactory;
    }

    parser = new loaded.PDFParse(parserOptions);

    const parsed = await withTimeout(
      parser.getText(),
      Number(limits?.pdfTextTimeoutMs || DEFAULT_LIMITS.pdfTextTimeoutMs),
      "pdf_text_timeout"
    );

    const text = clip(stripPdfPageMarkers(parsed?.text || ""), maxChars);

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
    const msg = String(error?.message || error || "");

    if (msg.includes("pdf_text_timeout")) {
      return {
        ok: false,
        method: "pdf-parse",
        text: "",
        reason: "timeout",
      };
    }

    return {
      ok: false,
      method: "pdf-parse",
      text: "",
      reason: `parse_error:${cleanReason(error, "pdf_parse_failed")}`,
    };
  } finally {
    if (parser && typeof parser.destroy === "function") {
      try {
        await parser.destroy();
      } catch {}
    }
  }
}

async function loadPdf2JsonClass() {
  try {
    const moduleNs = await import("pdf2json");
    const PDFParser = moduleNs?.default || moduleNs?.PDFParser || moduleNs?.default?.PDFParser || moduleNs;

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

async function extractPdfTextWithPdf2Json(buffer, maxChars, limits) {
  const loaded = await loadPdf2JsonClass();

  if (!loaded.ok || typeof loaded.PDFParser !== "function") {
    return {
      ok: false,
      method: "pdf2json",
      text: "",
      reason: loaded.reason || "missing_parser:pdf2json_class_unavailable",
    };
  }

  return await withTimeout(
    new Promise((resolve) => {
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
          reason: `parse_error:${cleanReason(err?.parserError || err, "pdf2json_data_error")}`,
        });
      });

      parser.on("pdfParser_dataReady", () => {
        try {
          const rawText =
            typeof parser.getRawTextContent === "function" ? parser.getRawTextContent() : "";

          const text = clip(stripPdfPageMarkers(rawText || ""), maxChars);

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
    }),
    Number(limits?.pdfTextTimeoutMs || DEFAULT_LIMITS.pdfTextTimeoutMs),
    "pdf2json_timeout"
  ).catch((error) => {
    const msg = String(error?.message || error || "");

    if (msg.includes("pdf2json_timeout")) {
      return {
        ok: false,
        method: "pdf2json",
        text: "",
        reason: "timeout",
      };
    }

    return {
      ok: false,
      method: "pdf2json",
      text: "",
      reason: `parse_error:${cleanReason(error, "pdf2json_failed")}`,
    };
  });
}

async function extractImageText(buffer, maxChars, limits, mimeType, filename) {
  if (!isOcrSupportedImage(mimeType, filename)) {
    return { ok: false, method: "ocr", text: "", reason: "unsupported_mime" };
  }

  try {
    const tesseractModule = await import("tesseract.js");
    const Tesseract = tesseractModule?.default || tesseractModule;

    const result = await withTimeout(
      Tesseract.recognize(buffer, "eng"),
      Number(limits?.ocrTimeoutMs || DEFAULT_LIMITS.ocrTimeoutMs),
      "ocr_timeout"
    );

    const text = clip(result?.data?.text || "", maxChars);

    if (!text.trim()) {
      return { ok: false, method: "ocr", text: "", reason: "empty" };
    }

    return { ok: true, method: "ocr", text };
  } catch (error) {
    const msg = String(error?.message || error || "");

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

async function extractScannedPdfTextWithInlineOcr(buffer, maxChars, limits, filename) {
  try {
    const moduleNs = await import("./pdfOcr");
    const extractScannedPdfText =
      moduleNs?.extractScannedPdfText || moduleNs?.default?.extractScannedPdfText;

    if (typeof extractScannedPdfText !== "function") {
      return {
        ok: false,
        method: "ocr",
        text: "",
        reason: "missing_parser:pdf_ocr_runtime_unavailable",
      };
    }

    return await extractScannedPdfText({
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
  } catch (error) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `missing_parser:${cleanReason(error, "inline_pdf_ocr_load_failed")}`,
    };
  }
}

async function extractPdfText(buffer, maxChars, limits, filename) {
  const primary = await extractPdfTextWithPdfParse(buffer, maxChars, limits);
  if (primary?.ok && String(primary.text || "").trim()) {
    return primary;
  }

  const allowPdf2JsonFallback = resolveBooleanOption(
    limits?.allowPdf2JsonFallback,
    "THOXIE_ENABLE_PDF2JSON_FALLBACK",
    DEFAULT_LIMITS.allowPdf2JsonFallback
  );

  let secondary = null;
  if (allowPdf2JsonFallback) {
    secondary = await extractPdfTextWithPdf2Json(buffer, maxChars, limits);
    if (secondary?.ok && String(secondary.text || "").trim()) {
      return secondary;
    }
  }

  const emptyTextLayerDetected =
    String(primary?.reason || "") === "empty_pdf_text_layer" ||
    String(secondary?.reason || "") === "empty_pdf_text_layer";

  const allowInlinePdfOcr = resolveBooleanOption(
    limits?.allowInlinePdfOcr,
    "THOXIE_ENABLE_INLINE_PDF_OCR",
    DEFAULT_LIMITS.allowInlinePdfOcr
  );

  if (allowInlinePdfOcr && emptyTextLayerDetected) {
    const scannedPdfResult = await extractScannedPdfTextWithInlineOcr(
      buffer,
      maxChars,
      limits,
      filename
    );

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
  }

  if (emptyTextLayerDetected) {
    return {
      ok: false,
      method: secondary?.method || primary?.method || "pdf",
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
