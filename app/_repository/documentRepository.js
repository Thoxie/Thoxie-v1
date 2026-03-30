// PATH: /app/_repository/documentRepository.js
// DIRECTORY: /app/_repository
// FILE: documentRepository.js
// ACTION: OVERWRITE ENTIRE FILE

"use client";

const docCache = new Map();

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function buildPreviewText(value) {
  return String(value || "").slice(0, 600);
}

function toMetadataOnlyInput(doc) {
  const input = doc && typeof doc === "object" ? doc : null;
  if (!input) return null;

  const rawExtractedText = String(input.extractedText || "");

  return {
    ...input,
    previewText:
      "previewText" in input
        ? String(input.previewText || "")
        : buildPreviewText(rawExtractedText),
    extractedText: "",
    detailLoaded: false,
    hasStoredText:
      "hasStoredText" in input
        ? !!input.hasStoredText
        : !!rawExtractedText.trim(),
    textLength:
      "textLength" in input
        ? toNumber(input.textLength)
        : rawExtractedText.length,
  };
}

function normalizeDoc(doc) {
  const input = doc && typeof doc === "object" ? doc : null;
  if (!input) return null;

  const rawExtractedText = String(input.extractedText || "");
  const detailLoaded = !!input.detailLoaded;
  const extractedText = detailLoaded ? rawExtractedText : "";
  const previewText = String(
    input.previewText != null ? input.previewText : buildPreviewText(rawExtractedText)
  );
  const chunkCount = toNumber(input.chunkCount);
  const textLength = "textLength" in input ? toNumber(input.textLength) : rawExtractedText.length;
  const hasStoredText =
    "hasStoredText" in input
      ? !!input.hasStoredText
      : textLength > 0 || !!previewText.trim() || !!rawExtractedText.trim();

  return {
    ...input,
    blob: null,
    docId: String(input.docId || input.id || ""),
    caseId: String(input.caseId || ""),
    name: String(input.name || ""),
    mimeType: String(input.mimeType || ""),
    size: toNumber(input.size ?? input.sizeBytes),
    sizeBytes: toNumber(input.sizeBytes ?? input.size),
    docType: String(input.docType || "evidence"),
    exhibitDescription: String(input.exhibitDescription || ""),
    evidenceCategory: String(input.evidenceCategory || ""),
    evidenceSupports: Array.isArray(input.evidenceSupports) ? input.evidenceSupports : [],
    blobUrl: String(input.blobUrl || ""),
    uploadedAt: input.uploadedAt || "",
    previewText,
    extractedText,
    extractionMethod: String(input.extractionMethod || ""),
    ocrStatus: String(input.ocrStatus || ""),
    ocrJobId: String(input.ocrJobId || ""),
    ocrProvider: String(input.ocrProvider || ""),
    ocrRequestedAt: input.ocrRequestedAt || "",
    ocrCompletedAt: input.ocrCompletedAt || "",
    ocrError: String(input.ocrError || ""),
    textLength,
    chunkCount,
    hasStoredText,
    readableByAI:
      "readableByAI" in input ? !!input.readableByAI : hasStoredText && chunkCount > 0,
    detailLoaded,
  };
}

function mergeWithExisting(normalized) {
  if (!normalized?.docId) return normalized;

  const previous = docCache.get(String(normalized.docId));
  if (!previous) return normalized;

  if (previous.detailLoaded && !normalized.detailLoaded) {
    return {
      ...normalized,
      extractedText: previous.extractedText,
      previewText: normalized.previewText || previous.previewText,
      textLength: normalized.textLength || previous.textLength,
      hasStoredText: normalized.hasStoredText || previous.hasStoredText,
      readableByAI: normalized.readableByAI || previous.readableByAI,
      detailLoaded: true,
    };
  }

  return {
    ...previous,
    ...normalized,
    evidenceSupports: normalized.evidenceSupports,
    detailLoaded: normalized.detailLoaded || previous.detailLoaded,
    extractedText:
      normalized.detailLoaded || !previous.detailLoaded
        ? normalized.extractedText
        : previous.extractedText,
    previewText: normalized.previewText || previous.previewText,
    textLength: normalized.textLength || previous.textLength,
    hasStoredText: normalized.hasStoredText || previous.hasStoredText,
    readableByAI: normalized.readableByAI || previous.readableByAI,
  };
}

function remember(doc) {
  const normalized = normalizeDoc(doc);
  if (!normalized || !normalized.docId) {
    return normalized;
  }

  const merged = mergeWithExisting(normalized);
  docCache.set(String(merged.docId), merged);
  return merged;
}

function rememberMany(docs) {
  const list = Array.isArray(docs) ? docs : [];
  return list.map((item) => remember(item)).filter(Boolean);
}

function forget(docId) {
  if (!docId) return;
  docCache.delete(String(docId));
}

async function readResponse(res) {
  const rawText = await res.text();

  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {}

  return { rawText, json };
}

function buildHttpError(prefix, status, payload) {
  const msg = payload?.json?.error || payload?.rawText || `${prefix} (HTTP ${status})`;

  const err = new Error(msg);
  err.status = status;
  err.payload = payload?.json || null;
  err.rawText = payload?.rawText || "";
  return err;
}

function inferMimeTypeFromName(name, currentType) {
  const declared = String(currentType || "").trim().toLowerCase();
  if (declared) return declared;

  const lower = String(name || "").trim().toLowerCase();

  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (lower.endsWith(".doc")) {
    return "application/msword";
  }

  if (lower.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lower.endsWith(".txt")) {
    return "text/plain";
  }

  if (lower.endsWith(".md")) {
    return "text/markdown";
  }

  if (lower.endsWith(".json")) {
    return "application/json";
  }

  if (lower.endsWith(".png")) {
    return "image/png";
  }

  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  return "application/octet-stream";
}

function buildMultipartPayload(caseId, file, docType) {
  const form = new FormData();

  form.append("caseId", String(caseId));
  form.append("docType", String(docType || "evidence"));

  const normalizedType = inferMimeTypeFromName(file?.name, file?.type);
  const uploadFile =
    file?.type === normalizedType
      ? file
      : new File([file], file.name, {
          type: normalizedType,
          lastModified: Number(file?.lastModified || Date.now()),
        });

  form.append("files", uploadFile, uploadFile.name);
  return form;
}

function hasBatchPayload(payload) {
  return (
    Array.isArray(payload?.json?.uploaded) ||
    Array.isArray(payload?.json?.failed) ||
    Array.isArray(payload?.json?.documents)
  );
}

function isFatalUploadError(error) {
  const status = Number(error?.status || 0);
  return status === 400 || status === 401 || status === 403 || status === 404 || status === 413;
}

function normalizeUploadPayload(caseId, file, payload, res) {
  const json = payload?.json || {};
  const uploaded = Array.isArray(json.uploaded)
    ? json.uploaded.map((item) => toMetadataOnlyInput(item)).filter(Boolean)
    : [];
  const failed = Array.isArray(json.failed) ? json.failed : [];

  if (!res.ok && !failed.length && json?.error) {
    failed.push({
      name: String(file?.name || ""),
      error: String(json.error || `Upload failed (HTTP ${res.status})`),
    });
  }

  return {
    ok: !!json.ok && failed.length === 0,
    caseId: json.caseId || String(caseId),
    uploaded,
    failed,
  };
}

async function uploadSingleFile(caseId, file, { docType = "evidence" } = {}) {
  const form = buildMultipartPayload(caseId, file, docType);

  const res = await fetch("/api/ingest", {
    method: "POST",
    body: form,
  });

  const payload = await readResponse(res);

  if (res.ok || res.status === 207 || hasBatchPayload(payload)) {
    return normalizeUploadPayload(caseId, file, payload, res);
  }

  throw buildHttpError("Upload failed", res.status, payload);
}

export const DocumentRepository = {
  async addFiles(caseId, files, { docType = "evidence" } = {}) {
    const list = Array.from(files || []).filter(Boolean);

    if (!caseId) throw new Error("Missing caseId");
    if (!list.length) return { ok: true, uploaded: [], failed: [] };

    const uploaded = [];
    const failed = [];
    let resolvedCaseId = String(caseId);

    for (const file of list) {
      try {
        const result = await uploadSingleFile(caseId, file, { docType });
        resolvedCaseId = result.caseId || resolvedCaseId;
        uploaded.push(...(Array.isArray(result.uploaded) ? result.uploaded : []));
        failed.push(...(Array.isArray(result.failed) ? result.failed : []));
      } catch (error) {
        if (isFatalUploadError(error)) {
          throw error;
        }

        failed.push({
          name: String(file?.name || ""),
          error: String(error?.message || error || "Upload failed"),
        });
      }
    }

    return {
      ok: failed.length === 0,
      caseId: resolvedCaseId,
      uploaded: rememberMany(uploaded),
      failed,
    };
  },

  async listByCaseId(caseId) {
    if (!caseId) return [];

    const res = await fetch(`/api/documents?caseId=${encodeURIComponent(caseId)}`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readResponse(res);

    if (!res.ok) {
      throw buildHttpError("Could not load documents", res.status, payload);
    }

    return rememberMany(Array.isArray(payload?.json?.documents) ? payload.json.documents : []);
  },

  async get(docId) {
    if (!docId) return null;

    const cached = docCache.get(String(docId));
    if (cached?.detailLoaded) {
      return cached;
    }

    const res = await fetch(`/api/documents?docId=${encodeURIComponent(docId)}`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readResponse(res);

    if (!res.ok) {
      throw buildHttpError("Could not load document", res.status, payload);
    }

    return remember(payload?.json?.document || null);
  },

  async getObjectUrl(docId) {
    const doc = await this.get(docId);

    if (!doc?.docId) return null;

    return `/api/documents?docId=${encodeURIComponent(doc.docId)}&open=1`;
  },

  async updateMetadata(docId, patch = {}) {
    if (!docId) return null;

    const res = await fetch("/api/documents", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        docId,
        patch,
      }),
    });

    const payload = await readResponse(res);

    if (!res.ok) {
      throw buildHttpError("Could not update document", res.status, payload);
    }

    return remember(payload?.json?.document || null);
  },

  async retryExternalOcr(docId) {
    if (!docId) {
      throw new Error("Missing docId");
    }

    const res = await fetch("/api/ocr/retry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ docId }),
    });

    const payload = await readResponse(res);

    if (!res.ok) {
      throw buildHttpError("Could not retry external OCR", res.status, payload);
    }

    const cached = docCache.get(String(docId));
    if (cached) {
      remember({
        ...cached,
        ocrStatus: payload?.json?.ocrStatus || "queued_external",
        ocrJobId: payload?.json?.ocrJobId || cached.ocrJobId || "",
        ocrProvider: payload?.json?.ocrProvider || cached.ocrProvider || "",
        ocrRequestedAt: payload?.json?.ocrRequestedAt || cached.ocrRequestedAt || "",
        ocrCompletedAt: "",
        ocrError: "",
        detailLoaded: !!cached.detailLoaded,
      });
    }

    return payload?.json || { ok: true, docId };
  },

  async delete(docId) {
    if (!docId) throw new Error("Missing docId");

    const res = await fetch("/api/documents", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ docId }),
    });

    const payload = await readResponse(res);

    if (!res.ok) {
      throw buildHttpError("Could not delete document", res.status, payload);
    }

    forget(docId);

    return payload?.json || { ok: true };
  },

  forget,
};
