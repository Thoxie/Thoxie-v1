// FILE: extractText.js
// PATH: app/_lib/documents/extractText.js
// ACTION: OVERWRITE

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

async function loadPdfParseModule() {
  try {
    return await import("pdf-parse");
  } catch (error) {
    return { __loadError: error };
  }
}

async function extractPdfText(buffer, maxChars) {
  const pdfModule = await loadPdfParseModule();

  if (pdfModule?.__loadError) {
    return {
      ok: false,
      method: "pdf",
      text: "",
      reason: `missing_parser:${cleanReason(pdfModule.__loadError, "pdf_parse_load_failed")}`,
    };
  }

  const candidates = [pdfModule, pdfModule?.default].filter(Boolean);

  for (const candidate of candidates) {
    if (typeof candidate === "function") {
      const attempts = [
        { label: "pdf_fn_buffer", invoke: () => candidate(buffer) },
        { label: "pdf_fn_data", invoke: () => candidate({ data: buffer }) },
        { label: "pdf_fn_buffer_obj", invoke: () => candidate({ buffer }) },
      ];

      for (const attempt of attempts) {
        try {
          const result = await attempt.invoke();
          const text = clip(result?.text || result?.data?.text || result?.value || "", maxChars);

          if (text.trim()) {
            return { ok: true, method: attempt.label, text };
          }
        } catch (error) {
          const reason = cleanReason(error);
          const lowered = lower(reason);

          if (lowered.includes("dommatrix")) {
            return {
              ok: false,
              method: attempt.label,
              text: "",
              reason: "parse_error:dommatrix_missing",
            };
          }

          if (lowered.includes("path2d")) {
            return {
              ok: false,
              method: attempt.label,
              text: "",
              reason: "parse_error:path2d_missing",
            };
          }
        }
      }
    }

    if (candidate && typeof candidate.PDFParse === "function") {
      let parser = null;

      try {
        parser = new candidate.PDFParse({ data: buffer });
        const textResult =
          typeof parser.getText === "function" ? await parser.getText().catch(() => null) : null;
        const text = clip(textResult?.text || "", maxChars);

        if (text.trim()) {
          return { ok: true, method: "pdf_class_getText", text };
        }

        return { ok: false, method: "pdf_class_getText", text: "", reason: "empty_pdf_text_layer" };
      } catch (error) {
        const reason = cleanReason(error);
        const lowered = lower(reason);

        if (lowered.includes("dommatrix")) {
          return {
            ok: false,
            method: "pdf_class_getText",
            text: "",
            reason: "parse_error:dommatrix_missing",
          };
        }

        if (lowered.includes("path2d")) {
          return {
            ok: false,
            method: "pdf_class_getText",
            text: "",
            reason: "parse_error:path2d_missing",
          };
        }

        return {
          ok: false,
          method: "pdf_class_getText",
          text: "",
          reason: `parse_error:${reason}`,
        };
      } finally {
        if (parser && typeof parser.destroy === "function") {
          try {
            await parser.destroy();
          } catch {}
        }
      }
    }
  }

  return {
    ok: false,
    method: "pdf",
    text: "",
    reason: "missing_parser:no_supported_pdf_entrypoint",
  };
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
    result = await extractPdfText(buffer, maxChars);
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
