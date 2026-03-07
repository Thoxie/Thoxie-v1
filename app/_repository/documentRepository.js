/* FILE: app/_repository/documentRepository.js */
/* ACTION: FULL OVERWRITE EXISTING FILE */

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

async function readResponse(res) {
  const rawText = await res.text();

  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  return { rawText, json };
}

function buildHttpError(prefix, status, payload) {
  const msg =
    payload?.json?.error ||
    payload?.rawText ||
    `${prefix} (HTTP ${status})`;

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

    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export const DocumentRepository = {
  async addFiles(caseId, files, { docType = "evidence" } = {}) {
    const list = Array.from(files || []).filter(Boolean);

    if (!caseId) throw new Error("DocumentRepository.addFiles: missing caseId");
    if (!list.length) return { ok: true, results: [] };

    const documents = await Promise.all(
      list.map(async (file) => {
        const base64 = await fileToBase64(file);

        return {
          name: file.name,
          mimeType: file.type || "application/octet-stream",
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

    if (!res.ok) {
      throw buildHttpError("Upload failed", res.status, payload);
    }

    return payload.json || { ok: true };
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

  async delete() {
    throw new Error("Delete document is not implemented yet.");
  },
};
