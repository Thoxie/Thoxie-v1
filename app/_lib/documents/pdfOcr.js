// PATH: app/_lib/documents/pdfOcr.js
// FILE: pdfOcr.js
// ACTION: FULL OVERWRITE

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

function bufferToDataUrl(buffer, mimeType) {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

async function loadScribeRuntime() {
  try {
    const moduleNs = await import("scribe.js-ocr");
    const scribe = moduleNs?.default || moduleNs;

    if (!scribe || typeof scribe.extractText !== "function") {
      return {
        ok: false,
        reason: "missing_parser:scribe_runtime_unavailable",
      };
    }

    return { ok: true, scribe };
  } catch (error) {
    return {
      ok: false,
      reason: `missing_parser:${cleanReason(error, "scribe_runtime_load_failed")}`,
    };
  }
}

function collectTextCandidates(value, out = []) {
  if (!value) return out;

  if (typeof value === "string") {
    const text = normalizeText(value);
    if (text) out.push(text);
    return out;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextCandidates(item, out);
    }
    return out;
  }

  if (typeof value === "object") {
    const likelyKeys = [
      "text",
      "fullText",
      "rawText",
      "content",
      "markdown",
      "ocrText",
      "pages",
      "results",
      "data",
      "output",
      "blocks",
      "lines",
    ];

    for (const key of likelyKeys) {
      if (key in value) {
        collectTextCandidates(value[key], out);
      }
    }
  }

  return out;
}

function extractTextFromScribeResult(result, maxChars) {
  const candidates = collectTextCandidates(result, []);
  const merged = clip(candidates.join("\n\n"), maxChars);
  return normalizeText(merged);
}

async function runScribeExtract({ buffer, mimeType, maxChars }) {
  const runtime = await loadScribeRuntime();
  if (!runtime.ok) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: runtime.reason || "missing_parser:scribe_runtime_unavailable",
    };
  }

  try {
    const source = bufferToDataUrl(buffer, mimeType);
    const result = await runtime.scribe.extractText([source]);
    const text = extractTextFromScribeResult(result, maxChars);

    if (!text) {
      return {
        ok: false,
        method: "ocr",
        text: "",
        reason: mimeType === "application/pdf" ? "empty_pdf_ocr" : "empty",
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
      reason: `parse_error:${cleanReason(error, "scribe_extract_failed")}`,
    };
  }
}

export async function extractImageBufferText({
  buffer,
  mimeType = "image/png",
  maxChars = 180_000,
}) {
  if (!buffer) {
    return { ok: false, method: "ocr", text: "", reason: "no_buffer" };
  }

  return await runScribeExtract({
    buffer,
    mimeType,
    maxChars,
  });
}

export async function extractScannedPdfText({
  buffer,
  maxChars = 180_000,
}) {
  if (!buffer) {
    return { ok: false, method: "ocr", text: "", reason: "no_buffer" };
  }

  return await runScribeExtract({
    buffer,
    mimeType: "application/pdf",
    maxChars,
  });
}
