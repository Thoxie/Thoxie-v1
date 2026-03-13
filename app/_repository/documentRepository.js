/* PATH: app/_repository/documentRepository.js */
/* FILE: documentRepository.js */
/* ACTION: FULL OVERWRITE */

"use client";

const docCache = new Map();

function normalizeDoc(doc) {
  const input = doc && typeof doc === "object" ? doc : null;
  if (!input) return null;

  const extractedText = String(input.extractedText || "");
  const chunkCount = Number(input.chunkCount || 0);
  const hasStoredText =
    "hasStoredText" in input
      ? !!input.hasStoredText
      : !!extractedText.trim();

  const textLength =
    "textLength" in input
      ? Number(input.textLength || 0)
      : extractedText.length;

  return {
    ...input,
    name: String(input.name || ""),
    mimeType: String(input.mimeType || ""),
    size: Number(input.size ?? input.sizeBytes ?? 0),
    sizeBytes: Number(input.sizeBytes ?? input.size ?? 0),
    docType: String(input.docType || "evidence"),
    exhibitDescription: String(input.exhibitDescription || ""),
    evidenceCategory: String(input.evidenceCategory || ""),
    evidenceSupports: Array.isArray(input.evidenceSupports) ? input.evidenceSupports : [],
    blobUrl: String(input.blobUrl || ""),
    uploadedAt: input.uploadedAt || "",
    extractedText,
    extractionMethod: String(input.extractionMethod || ""),
    ocrStatus: String(input.ocrStatus || ""),
    textLength,
    chunkCount,
    hasStoredText,
    readableByAI:
      "readableByAI" in input
        ? !!input.readableByAI
        : hasStoredText && chunkCount > 0,
  };
}

function remember(doc) {
  const normalized = normalizeDoc(doc);
  if (normalized && normalized.docId) {
    docCache.set(String(normalized.docId), normalized);
  }
  return normalized;
}

function rememberMany(docs) {
  const list = Array.isArray(docs) ? docs : [];
  const normalized = list.map(normalizeDoc).filter(Boolean);

  for (const d of normalized) {
    remember(d);
  }

  return normalized;
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

function buildMultipartPayload(caseId, files, docType) {
  const form = new FormData();

  form.append("caseId", String(caseId));
  form.append("docType", String(docType || "evidence"));

  for (const file of Array.from(files || []).filter(Boolean)) {
    const normalizedType = inferMimeTypeFromName(file.name, file.type);
    const uploadFile =
      file.type === normalizedType
        ? file
        : new File([file], file.name, {
            type: normalizedType,
            lastModified: Number(file.lastModified || Date.now()),
          });

    form.append("files", uploadFile, uploadFile.name);
  }

  return form;
}

export const DocumentRepository = {
  async addFiles(caseId, files, { docType = "evidence" } = {}) {
    const list = Array.from(files || []).filter(Boolean);

    if (!caseId) throw new Error("Missing caseId");

    if (!list.length) return { ok: true, uploaded: [], failed: [] };

    const form = buildMultipartPayload(caseId, list, docType);

    const res = await fetch("/api/ingest", {
      method: "POST",
      body: form,
    });

    const payload = await readResponse(res);

    if (!res.ok && res.status !== 207) {
      throw buildHttpError("Upload failed", res.status, payload);
    }

    const json = payload.json || { ok: true, uploaded: [], failed: [] };

    return {
      ok: !!json.ok,
      caseId: json.caseId || String(caseId),
      uploaded: rememberMany(Array.isArray(json.uploaded) ? json.uploaded : []),
      failed: Array.isArray(json.failed) ? json.failed : [],
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
    if (cached) return cached;

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

  async delete(docId) {
    if (!docId) {
      throw new Error("Missing docId");
    }

    const res = await fetch("/api/documents", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        docId,
      }),
    });

    const payload = await readResponse(res);

    if (!res.ok) {
      throw buildHttpError("Could not delete document", res.status, payload);
    }

    forget(docId);

    return payload?.json || { ok: true };
  },
};
