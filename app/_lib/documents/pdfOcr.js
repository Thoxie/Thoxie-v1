/* PATH: app/_lib/documents/pdfOcr.js */
/* FILE: pdfOcr.js */
/* ACTION: FULL OVERWRITE */

import { createRequire } from "module";

const PDF_RENDER_SCALE = 2;
const PDF_MAX_RENDER_DIMENSION = 2200;
const PDF_MAX_RENDER_PIXELS = 4_500_000;
const PDF_RENDER_TIMEOUT_MS = 15_000;

const require = createRequire(import.meta.url);

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

async function withTimeout(promise, ms, label) {
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

async function loadPdfJsModule() {
  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (error) {
    return { __loadError: error };
  }
}

function loadCanvasModule() {
  try {
    return require("@napi-rs/canvas");
  } catch (error) {
    return { __loadError: error };
  }
}

function installCanvasPolyfills(canvasModule) {
  const api = canvasModule?.default || canvasModule;

  if (!api) {
    throw new Error("canvas_api_unavailable");
  }

  if (api.DOMMatrix && !globalThis.DOMMatrix) {
    globalThis.DOMMatrix = api.DOMMatrix;
  }

  if (api.ImageData && !globalThis.ImageData) {
    globalThis.ImageData = api.ImageData;
  }

  if (api.Path2D && !globalThis.Path2D) {
    globalThis.Path2D = api.Path2D;
  }

  if (typeof api.createCanvas !== "function") {
    throw new Error("canvas_create_unavailable");
  }

  return api;
}

function chooseRenderScale(page) {
  const baseViewport = page.getViewport({ scale: 1 });
  const baseWidth = Math.max(1, Number(baseViewport.width || 1));
  const baseHeight = Math.max(1, Number(baseViewport.height || 1));

  const byDimension = Math.min(
    PDF_MAX_RENDER_DIMENSION / baseWidth,
    PDF_MAX_RENDER_DIMENSION / baseHeight
  );

  const byPixels = Math.sqrt(PDF_MAX_RENDER_PIXELS / (baseWidth * baseHeight));
  const safeScale = Math.max(1, Math.min(PDF_RENDER_SCALE, byDimension, byPixels));

  return Number.isFinite(safeScale) ? safeScale : 1;
}

class NodeCanvasFactory {
  constructor(createCanvas) {
    this.createCanvas = createCanvas;
  }

  create(width, height) {
    const safeWidth = Math.max(1, Math.ceil(width || 1));
    const safeHeight = Math.max(1, Math.ceil(height || 1));
    const canvas = this.createCanvas(safeWidth, safeHeight);
    const context = canvas.getContext("2d", { alpha: false });

    return { canvas, context };
  }

  reset(target, width, height) {
    if (!target?.canvas) return;
    target.canvas.width = Math.max(1, Math.ceil(width || 1));
    target.canvas.height = Math.max(1, Math.ceil(height || 1));
  }

  destroy(target) {
    if (!target?.canvas) return;
    target.canvas.width = 0;
    target.canvas.height = 0;
  }
}

async function renderPdfPageToPngBuffer(canvasApi, pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const scale = chooseRenderScale(page);
  const viewport = page.getViewport({ scale });
  const canvasFactory = new NodeCanvasFactory(canvasApi.createCanvas);
  const target = canvasFactory.create(viewport.width, viewport.height);

  try {
    await withTimeout(
      page.render({
        canvasContext: target.context,
        viewport,
        canvasFactory,
        background: "#ffffff",
      }).promise,
      PDF_RENDER_TIMEOUT_MS,
      "pdf_render_timeout"
    );

    return target.canvas.toBuffer("image/png");
  } finally {
    try {
      page.cleanup();
    } catch {}
    canvasFactory.destroy(target);
  }
}

export async function extractScannedPdfText({
  buffer,
  filename,
  maxChars = 180_000,
  limits = {},
}) {
  const pdfjsModule = await loadPdfJsModule();
  if (pdfjsModule?.__loadError) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `missing_parser:${cleanReason(pdfjsModule.__loadError, "pdfjs_load_failed")}`,
    };
  }

  const rawCanvasModule = loadCanvasModule();
  if (rawCanvasModule?.__loadError) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `missing_parser:${cleanReason(rawCanvasModule.__loadError, "canvas_load_failed")}`,
    };
  }

  let canvasApi = null;

  try {
    canvasApi = installCanvasPolyfills(rawCanvasModule);
  } catch (error) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `missing_parser:${cleanReason(error, "canvas_setup_failed")}`,
    };
  }

  const pdfjsLib = pdfjsModule?.default || pdfjsModule;
  if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: "missing_parser:pdfjs_api_unavailable",
    };
  }

  let Tesseract = null;

  try {
    const tesseractModule = await import("tesseract.js");
    Tesseract = tesseractModule?.default || tesseractModule;
  } catch (error) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `missing_parser:${cleanReason(error, "tesseract_load_failed")}`,
    };
  }

  const pdfBuffer =
    buffer instanceof Uint8Array
      ? buffer
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const loadingTask = pdfjsLib.getDocument({
    data: pdfBuffer,
    disableWorker: true,
    useSystemFonts: false,
    isEvalSupported: false,
    stopAtErrors: false,
  });

  let pdf = null;

  try {
    pdf = await withTimeout(loadingTask.promise, PDF_RENDER_TIMEOUT_MS, "pdf_load_timeout");

    const pageTexts = [];
    const ocrTimeoutMs = Number(limits?.ocrTimeoutMs || 20_000);

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (maxChars && pageTexts.join("\n\n").length >= maxChars) break;

      const imageBuffer = await renderPdfPageToPngBuffer(canvasApi, pdf, pageNumber);

      const pageResult = await withTimeout(
        Tesseract.recognize(imageBuffer, "eng"),
        ocrTimeoutMs,
        "ocr_timeout"
      );

      const pageText = clip(pageResult?.data?.text || "", maxChars);
      if (pageText.trim()) {
        pageTexts.push(pageText);
      }
    }

    const combinedText = clip(pageTexts.join("\n\n"), maxChars);

    if (!combinedText.trim()) {
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
      text: combinedText,
      source: "scanned_pdf",
      filename: String(filename || ""),
    };
  } catch (error) {
    const message = String(error?.message || "");

    if (message.includes("ocr_timeout")) {
      return {
        ok: false,
        method: "ocr",
        text: "",
        reason: "timeout",
      };
    }

    if (message.includes("pdf_load_timeout") || message.includes("pdf_render_timeout")) {
      return {
        ok: false,
        method: "ocr",
        text: "",
        reason: "timeout",
      };
    }

    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `parse_error:${cleanReason(error, "pdf_ocr_failed")}`,
    };
  } finally {
    try {
      await loadingTask.destroy();
    } catch {}

    try {
      await pdf?.destroy?.();
    } catch {}
  }
}
