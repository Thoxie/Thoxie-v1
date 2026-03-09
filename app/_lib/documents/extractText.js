/* 1. PATH: app/_lib/documents/extractText.js */
/* 1. FILE: extractText.js */
/* 1. ACTION: OVERWRITE */

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

function stripNullBytes(value) {
  return String(value || "").replace(/\u0000/g, "");
}

function normalizeText(value) {
  return stripNullBytes(value).replace(/\r\n/g, "\n");
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
  const t = normalizeText(text);
  if (!maxChars || t.length <= maxChars) return t;
  return t.slice(0, maxChars);
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

async function loadPdfParseModule() {
  try {
    return await import("pdf-parse");
  } catch {
    return null;
  }
}

async function extractPdfText(buffer, maxChars) {
  const pdfModule = await loadPdfParseModule();
  if (!pdfModule) {
    return { ok: false, method: "pdf", text: "", reason: "missing_parser" };
  }

  const PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse || pdfModule.default;

  if (typeof PDFParseClass === "function") {
    let parser = null;

    try {
      parser = new PDFParseClass({ data: buffer });
      const result = await parser.getText();
      const text = clip(result?.text || "", maxChars);
      if (!text.trim()) return { ok: false, method: "pdf", text: "", reason: "empty" };
      return { ok: true, method: "pdf", text };
    } catch {
      return { ok: false, method: "pdf", text: "", reason: "parse_error" };
    } finally {
      if (parser && typeof parser.destroy === "function") {
        try {
          await parser.destroy();
        } catch {}
      }
    }
  }

  const maybeFn =
    typeof pdfModule === "function"
      ? pdfModule
      : typeof pdfModule?.default === "function"
        ? pdfModule.default
        : null;

  if (!maybeFn) {
    return { ok: false, method: "pdf", text: "", reason: "missing_parser" };
  }

  try {
    const result = await maybeFn(buffer);
    const text = clip(result?.text || "", maxChars);
    if (!text.trim()) return { ok: false, method: "pdf", text: "", reason: "empty" };
    return { ok: true, method: "pdf", text };
  } catch {
    return { ok: false, method: "pdf", text: "", reason: "parse_error" };
  }
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

  if (isDocx(mimeType, filename)) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const text = clip(result?.value || "", maxChars);
      if (!text.trim()) return { ok: false, method: "docx", text: "", reason: "empty" };
      return { ok: true, method: "docx", text };
    } catch {
      return { ok: false, method: "docx", text: "", reason: "parse_error" };
    }
  }

  if (isPdf(mimeType, filename)) {
    return extractPdfText(buffer, maxChars);
  }

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
    } catch (error) {
      const msg = String(error?.message || "");
      if (msg.includes("ocr_timeout")) {
        return { ok: false, method: "ocr", text: "", reason: "timeout" };
      }
      return { ok: false, method: "ocr", text: "", reason: "parse_error" };
    }
  }

  return { ok: false, method: "none", text: "", reason: "unsupported_mime" };
}
