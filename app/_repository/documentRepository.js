/* FILE: app/_repository/documentRepository.js */
/* ACTION: FULL OVERWRITE EXISTING FILE */

"use client";

/*
  SERVER-AUTHORITATIVE DOCUMENT REPOSITORY

  This replaces IndexedDB as the primary source of truth.
  The browser now acts only as a short-lived convenience cache.

  Preserved interface:
  - addFiles(caseId, files, { docType })
  - listByCaseId(caseId)
  - get(docId)
  - getObjectUrl(docId)
  - updateMetadata(docId, patch)
  - delete(docId)   // intentionally not implemented yet
*/

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

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
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

    const json = await safeJson(res);

    if (!res.ok) {
      throw new Error(json?.error || "Upload failed.");
    }

    return json;
  },

  async listByCaseId(caseId) {
    if (!caseId) return [];

    const res = await fetch(`/api/documents?caseId=${encodeURIComponent(caseId)}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await safeJson(res);

    if (!res.ok) {
      throw new Error(json?.error || "Could not load documents.");
    }

    return rememberMany(Array.isArray(json?.documents) ? json.documents : []);
  },

  async get(docId) {
    if (!docId) return null;

    const cached = docCache.get(String(docId));
    if (cached) return cached;

    const res = await fetch(`/api/documents?docId=${encodeURIComponent(docId)}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await safeJson(res);

    if (!res.ok) {
      throw new Error(json?.error || "Could not load document.");
    }

    return remember(json?.document || null);
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

    const json = await safeJson(res);

    if (!res.ok) {
      throw new Error(json?.error || "Could not update document.");
    }

    return remember(json?.document || null);
  },

  async delete() {
    throw new Error("Delete document is not implemented yet.");
  },
};
