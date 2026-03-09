/* 2. PATH: app/_lib/documents/extractText.js */
/* 2. FILE: extractText.js */
/* 2. ACTION: OVERWRITE */

const DEFAULT_LIMITS = {
  maxBytes: 8_000_000,
  ocrTimeoutMs: 20_000,
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
  const t = normalizeText(text);
  if (!maxChars || t.length <= maxChars) return t;
  return t.slice(0, maxChars).trim();
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
    fn.endsWith(".webp") ||
    fn.endsWith(".bmp") ||
    fn.endsWith(".gif") ||
    fn.endsWith(".tif") ||
    fn.endsWith(".tiff")
  );
}

function isOcrSupportedImage(mimeType, filename) {
  const mt = lower(mimeType);
  const fn = lower(filename);

  return (
    mt === "image/png" ||
    mt === "image/jpeg" ||
    mt === "image/jpg" ||
    mt === "image/webp" ||
    mt === "image/bmp" ||
    mt === "image/tiff" ||
    fn.endsWith(".png") ||
    fn.endsWith(".jpg") ||
    fn.endsWith(".jpeg") ||
    fn.endsWith(".webp") ||
    fn.endsWith(".bmp") ||
    fn.endsWith(".tif") ||
    fn.endsWith(".tiff")
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
  const merged = [];

  for (const candidate of candidates || []) {
    const lines = uniqueNonEmptyLines(candidate);
    for (const line of lines) {
      merged.push(line);
      if (merged.join("\n").length >= maxChars) {
        return clip(merged.join("\n"), maxChars);
      }
    }
  }

  return clip(merged.join("\n"), maxChars);
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

async function extractDocxText(buffer, maxChars) {
  try {
    const mammoth = await import("mammoth");

    const rawResult = await mammoth.extractRawText({ buffer }).catch(() => null);
    const htmlResult = await mammoth.convertToHtml({ buffer }).catch(() => null);

    const rawText = clip(rawResult?.value || "", maxChars);
    const htmlText = clip(htmlToText(htmlResult?.value || ""), maxChars);
    const merged = mergeTextCandidates([htmlText, rawText], maxChars);

    if (!merged.trim()) {
      return { ok: false, method: "docx", text: "", reason: "empty" };
    }

    return { ok: true, method: "docx", text: merged };
  } catch {
    return { ok: false, method: "docx", text: "", reason: "parse_error" };
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

      if (!text.trim()) {
        return { ok: false, method: "pdf", text: "", reason: "empty" };
      }

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

    if (!text.trim()) {
      return { ok: false, method: "pdf", text: "", reason: "empty" };
    }

    return { ok: true, method: "pdf", text };
  } catch {
    return { ok: false, method: "pdf", text: "", reason: "parse_error" };
  }
}

async function extractImageText(buffer, maxChars, limits, mimeType, filename) {
  if (!isOcrSupportedImage(mimeType, filename)) {
    return { ok: false, method: "ocr", text: "", reason: "unsupported_mime" };
  }

  try {
    const Tesseract = (await import("tesseract.js")).default;

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
    return { ok: false, method: "ocr", text: "", reason: "parse_error" };
  }
}

export async function extractTextFromBuffer({
  buffer,
  mimeType,
  filename,
  limits = DEFAULT_LIMITS,
  maxChars = 180_000,
}) {
  if (!buffer) {
    return { ok: false, method: "none", text: "", reason: "no_buffer" };
  }

  const size = Buffer.byteLength(buffer);
  if (limits?.maxBytes && size > limits.maxBytes) {
    return { ok: false, method: "none", text: "", reason: "too_large" };
  }

  if (isDocx(mimeType, filename)) {
    return extractDocxText(buffer, maxChars);
  }

  if (isPdf(mimeType, filename)) {
    return extractPdfText(buffer, maxChars);
  }

  if (isImage(mimeType, filename)) {
    return extractImageText(buffer, maxChars, limits, mimeType, filename);
  }

  return { ok: false, method: "none", text: "", reason: "unsupported_mime" };
}
