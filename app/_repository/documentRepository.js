/* 3. PATH: app/_repository/documentRepository.js */
/* 3. FILE: documentRepository.js */
/* 3. ACTION: OVERWRITE */

"use client";

const docCache = new Map();

function remember(doc) {
  if (doc && doc.docId) {
    docCache.set(String(doc.docId), doc);
  }
  return doc;
}

function rememberMany(docs) {
  const list = Array.isArray(docs) ? docs : [];
  for (const d of list) {
    remember(d);
  }
  return list;
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const idx = result.indexOf("base64,");
      resolve(idx >= 0 ? result.slice(idx + "base64,".length) : result);
    };

    reader.onerror = () => reject(reader.error || new Error("File read error"));
    reader.readAsDataURL(file);
  });
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

export const DocumentRepository = {
  async addFiles(caseId, files, { docType = "evidence" } = {}) {
    const list = Array.from(files || []).filter(Boolean);

    if (!caseId) throw new Error("Missing caseId");

    if (!list.length) return { ok: true, uploaded: [], failed: [] };

    const documents = await Promise.all(
      list.map(async (file) => {
        const base64 = await fileToBase64(file);

        return {
          name: file.name,
          mimeType: inferMimeTypeFromName(file.name, file.type),
          size: Number(file.size || 0),
          docType,
          base64,
        };
      })
    );

    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        caseId: String(caseId),
        documents,
      }),
    });

    const payload = await readResponse(res);

    if (!res.ok && res.status !== 207) {
      throw buildHttpError("Upload failed", res.status, payload);
    }

    const json = payload.json || { ok: true, uploaded: [], failed: [] };

    return {
      ok: !!json.ok,
      caseId: json.caseId || String(caseId),
      uploaded: Array.isArray(json.uploaded) ? json.uploaded : [],
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
