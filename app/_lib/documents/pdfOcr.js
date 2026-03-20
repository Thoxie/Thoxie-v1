// /app/_lib/documents/pdfOcr.js
// ACTION: OVERWRITE

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

function getCanvasFactory(canvasApi) {
  return {
    create(width, height) {
      const canvas = canvasApi.createCanvas(Math.max(1, width), Math.max(1, height));
      const context = canvas.getContext("2d");
      return { canvas, context };
    },
    reset(target, width, height) {
      if (!target?.canvas) {
        throw new Error("Canvas is not specified");
      }
      target.canvas.width = Math.max(1, width);
      target.canvas.height = Math.max(1, height);
    },
    destroy(target) {
      if (!target?.canvas) return;
      target.canvas.width = 0;
      target.canvas.height = 0;
      target.canvas = null;
      target.context = null;
    },
  };
}

function computeRenderScale(page, { targetLongSidePx = 2200, minScale = 1.5, maxScale = 3 } = {}) {
  const baseViewport = page.getViewport({ scale: 1 });
  const longSide = Math.max(baseViewport.width || 1, baseViewport.height || 1);
  const fittedScale = targetLongSidePx / longSide;
  return Math.max(minScale, Math.min(maxScale, fittedScale));
}

async function dynamicImport(specifier) {
  return await new Function("s", "return import(s)")(specifier);
}

function installNodeDomPolyfills(canvasApi) {
  if (!canvasApi) return;

  if (!globalThis.DOMMatrix && canvasApi.DOMMatrix) {
    globalThis.DOMMatrix = canvasApi.DOMMatrix;
  }

  if (!globalThis.ImageData && canvasApi.ImageData) {
    globalThis.ImageData = canvasApi.ImageData;
  }

  if (!globalThis.Path2D && canvasApi.Path2D) {
    globalThis.Path2D = canvasApi.Path2D;
  }
}

let pdfRuntimePromise = null;

async function loadPdfRuntime() {
  if (!pdfRuntimePromise) {
    pdfRuntimePromise = (async () => {
      try {
        const canvasModule = await dynamicImport("@napi-rs/canvas");
        const canvasApi = canvasModule?.default || canvasModule;

        installNodeDomPolyfills(canvasApi);

        const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const pdfjs = pdfjsModule?.default || pdfjsModule;

        if (pdfjs?.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = "";
        }

        if (!pdfjs?.getDocument || !canvasApi?.createCanvas) {
          return {
            ok: false,
            reason: "missing_parser:pdf_ocr_runtime_unavailable",
          };
        }

        return {
          ok: true,
          pdfjs,
          canvasApi,
        };
      } catch (error) {
        return {
          ok: false,
          reason: `missing_parser:${cleanReason(error, "pdf_ocr_runtime_load_failed")}`,
        };
      }
    })();
  }

  return await pdfRuntimePromise;
}

async function renderPdfPageToPngBuffer(page, canvasApi) {
  const scale = computeRenderScale(page);
  const viewport = page.getViewport({ scale });
  const canvasFactory = getCanvasFactory(canvasApi);
  const target = canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));

  try {
    const renderTask = page.render({
      canvasContext: target.context,
      viewport,
      canvasFactory,
      intent: "display",
    });

    await renderTask.promise;
    return target.canvas.toBuffer("image/png");
  } finally {
    canvasFactory.destroy(target);
  }
}

export async function extractScannedPdfText({
  buffer,
  maxChars = 180_000,
  ocrPageImage,
}) {
  if (!buffer) {
    return { ok: false, method: "ocr", text: "", reason: "no_buffer" };
  }

  if (typeof ocrPageImage !== "function") {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: "missing_parser:ocr_page_handler_unavailable",
    };
  }

  const runtime = await loadPdfRuntime();
  if (!runtime.ok) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: runtime.reason || "missing_parser:pdf_ocr_runtime_unavailable",
    };
  }

  const loadingTask = runtime.pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    standardFontDataUrl: undefined,
  });

  let pdfDocument = null;
  let totalChars = 0;
  const collectedPages = [];
  const pageErrors = [];

  try {
    pdfDocument = await loadingTask.promise;

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const remainingChars = Math.max(0, maxChars - totalChars);
      if (remainingChars <= 0) break;

      try {
        const page = await pdfDocument.getPage(pageNumber);
        const imageBuffer = await renderPdfPageToPngBuffer(page, runtime.canvasApi);

        const ocrResult = await ocrPageImage({
          imageBuffer,
          pageNumber,
          pageCount: pdfDocument.numPages,
          maxChars: remainingChars,
        });

        if (ocrResult?.ok && String(ocrResult.text || "").trim()) {
          const pageText = clip(ocrResult.text, remainingChars);
          if (pageText) {
            collectedPages.push(pageText);
            totalChars += pageText.length + 2;
          }
          continue;
        }

        if (ocrResult?.reason) {
          pageErrors.push(ocrResult.reason);
        }
      } catch (error) {
        pageErrors.push(`parse_error:${cleanReason(error, "pdf_page_render_failed")}`);
      }
    }
  } catch (error) {
    return {
      ok: false,
      method: "ocr",
      text: "",
      reason: `parse_error:${cleanReason(error, "pdf_ocr_document_load_failed")}`,
    };
  } finally {
    if (pdfDocument && typeof pdfDocument.destroy === "function") {
      try {
        await pdfDocument.destroy();
      } catch {}
    }

    if (loadingTask && typeof loadingTask.destroy === "function") {
      try {
        await loadingTask.destroy();
      } catch {}
    }
  }

  const mergedText = clip(collectedPages.join("\n\n"), maxChars);

  if (mergedText) {
    return {
      ok: true,
      method: "ocr",
      text: mergedText,
      pagesProcessed: collectedPages.length,
      pageCount: pdfDocument?.numPages || collectedPages.length,
      partial: pageErrors.length > 0,
    };
  }

  const firstError = String(pageErrors[0] || "");

  if (firstError.includes("timeout")) {
    return { ok: false, method: "ocr", text: "", reason: "timeout" };
  }

  if (firstError.startsWith("missing_parser:")) {
    return { ok: false, method: "ocr", text: "", reason: firstError };
  }

  if (firstError.startsWith("parse_error:")) {
    return { ok: false, method: "ocr", text: "", reason: firstError };
  }

  return {
    ok: false,
    method: "ocr",
    text: "",
    reason: "empty_pdf_ocr",
  };
}
