/* FILE: app/_repository/documentRepository.js */
/* FULL OVERWRITE */

"use client";

async function readResponse(res) {
  const rawText = await res.text();

  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {}

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

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const DocumentRepository = {

  async addFiles(caseId, files) {

    const list = Array.from(files || []).filter(Boolean);

    const documents = await Promise.all(
      list.map(async (file) => ({
        name: file.name,
        mimeType: file.type,
        size: file.size,
        base64: await fileToBase64(file)
      }))
    );

    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        caseId,
        documents
      })
    });

    const payload = await readResponse(res);

    if (!res.ok) {
      throw buildHttpError("Upload failed", res.status, payload);
    }

    return payload.json;
  }

};
