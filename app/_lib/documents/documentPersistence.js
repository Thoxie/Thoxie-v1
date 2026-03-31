// PATH: /app/_lib/documents/documentPersistence.js
// DIRECTORY: /app/_lib/documents
// FILE: documentPersistence.js
// ACTION: NEW FILE

import { chunkText } from "@/app/_lib/rag/chunkText";
import { RAG_LIMITS } from "@/app/_lib/rag/limits";

function logDocumentPersistenceDiagnostic(payload = {}) {
  console.info(
    "UPLOAD_DIAGNOSTIC",
    JSON.stringify({
      scope: "documentPersistence",
      ...payload,
    })
  );
}

export function stripNullBytes(value) {
  return String(value || "").replace(/\u0000/g, "");
}

export function cleanStoredText(value) {
  return stripNullBytes(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

export function cleanStoredLabel(value) {
  return cleanStoredText(value).replace(/\s+/g, " ").trim();
}

export function cleanStructuralFlags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanStoredLabel(item))
    .filter(Boolean)
    .slice(0, 20);
}

export function clipStoredText(value, maxChars = Number(RAG_LIMITS.maxStoredCharsPerDoc || 0)) {
  const text = cleanStoredText(value);
  if (!maxChars || maxChars <= 0 || text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars).trim();
}

function clipForIndexing(value) {
  const text = cleanStoredText(value);
  const maxChars = Number(RAG_LIMITS.maxCharsPerDoc || 180_000);
  if (!maxChars || text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim();
}

function normalizeChunkRecords(rawChunks) {
  const list = Array.isArray(rawChunks) ? rawChunks : [];

  return list
    .map((chunk, index) => {
      if (typeof chunk === "string") {
        const text = cleanStoredText(chunk);
        if (!text) return null;
        return {
          chunkIndex: index,
          text,
          chunkKind: "",
          chunkLabel: `section ${index + 1}`,
          sectionLabel: "",
          pageStart: null,
          pageEnd: null,
          charStart: null,
          charEnd: null,
          structuralFlags: [],
        };
      }

      if (!chunk || typeof chunk !== "object") return null;

      const text = cleanStoredText(chunk.text || "");
      if (!text) return null;

      const pageStart = Number.isFinite(Number(chunk.pageStart)) ? Number(chunk.pageStart) : null;
      const pageEnd = Number.isFinite(Number(chunk.pageEnd)) ? Number(chunk.pageEnd) : null;
      const charStart = Number.isFinite(Number(chunk.charStart)) ? Number(chunk.charStart) : null;
      const charEnd = Number.isFinite(Number(chunk.charEnd)) ? Number(chunk.charEnd) : null;

      return {
        chunkIndex: Number.isFinite(Number(chunk.chunkIndex)) ? Number(chunk.chunkIndex) : index,
        text,
        chunkKind: cleanStoredLabel(chunk.chunkKind || ""),
        chunkLabel: cleanStoredLabel(chunk.label || chunk.chunkLabel || "") || `section ${index + 1}`,
        sectionLabel: cleanStoredLabel(chunk.sectionLabel || ""),
        pageStart,
        pageEnd,
        charStart,
        charEnd,
        structuralFlags: cleanStructuralFlags(chunk.structuralFlags),
      };
    })
    .filter(Boolean)
    .slice(0, 250);
}

export async function upsertDocumentRow(poolOrClient, values) {
  const {
    docId,
    caseId,
    name,
    mimeType,
    sizeBytes,
    docType,
    blobUrl,
    extractedText,
    extractionMethod,
    ocrStatus,
    ocrJobId,
    ocrProvider,
    ocrRequestedAt,
    ocrCompletedAt,
    ocrError,
  } = values;

  await poolOrClient.query(
    `
    insert into thoxie_document
      (
        doc_id,
        case_id,
        name,
        mime_type,
        size_bytes,
        doc_type,
        blob_url,
        extracted_text,
        extraction_method,
        ocr_status,
        ocr_job_id,
        ocr_provider,
        ocr_requested_at,
        ocr_completed_at,
        ocr_error,
        uploaded_at
      )
    values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
    on conflict (doc_id) do update set
      case_id = excluded.case_id,
      name = excluded.name,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      doc_type = excluded.doc_type,
      blob_url = excluded.blob_url,
      extracted_text = excluded.extracted_text,
      extraction_method = excluded.extraction_method,
      ocr_status = excluded.ocr_status,
      ocr_job_id = excluded.ocr_job_id,
      ocr_provider = excluded.ocr_provider,
      ocr_requested_at = excluded.ocr_requested_at,
      ocr_completed_at = excluded.ocr_completed_at,
      ocr_error = excluded.ocr_error
    `,
    [
      docId,
      caseId,
      name,
      mimeType,
      sizeBytes,
      docType,
      blobUrl,
      cleanStoredText(extractedText || ""),
      cleanStoredLabel(extractionMethod || ""),
      cleanStoredLabel(ocrStatus || ""),
      cleanStoredLabel(ocrJobId || ""),
      cleanStoredLabel(ocrProvider || ""),
      ocrRequestedAt,
      ocrCompletedAt,
      cleanStoredText(ocrError || ""),
    ]
  );
}

export async function persistDocumentChunks(poolOrClient, { caseId, docId, extractedText, name = "" }) {
  const indexableText = clipForIndexing(extractedText || "");
  const rawChunks = chunkText(indexableText, { returnObjects: true });
  let chunks = normalizeChunkRecords(rawChunks);

  if (chunks.length === 0 && indexableText) {
    chunks = [
      {
        chunkIndex: 0,
        text: indexableText,
        chunkKind: "body",
        chunkLabel: "section 1",
        sectionLabel: "",
        pageStart: null,
        pageEnd: null,
        charStart: null,
        charEnd: null,
        structuralFlags: ["fallback_single_chunk"],
      },
    ];
  }

  logDocumentPersistenceDiagnostic({
    event: "chunk_persist_start",
    doc_id: docId,
    file: name || "(unnamed)",
    stored_text_length: String(extractedText || "").length,
    indexed_text_length: indexableText.length,
    chunks_produced: Array.isArray(rawChunks) ? rawChunks.length : 0,
    chunks_capped: chunks.length,
  });

  await poolOrClient.query(
    `
    delete from thoxie_document_chunk
    where doc_id = $1
    `,
    [docId]
  );

  let insertedCount = 0;

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (!chunk?.text) continue;

    await poolOrClient.query(
      `
      insert into thoxie_document_chunk
        (
          chunk_id,
          case_id,
          doc_id,
          chunk_index,
          chunk_text,
          chunk_kind,
          chunk_label,
          section_label,
          page_start,
          page_end,
          char_start,
          char_end,
          structural_flags
        )
      values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
      on conflict (doc_id, chunk_index)
      do update set
        chunk_text = excluded.chunk_text,
        chunk_kind = excluded.chunk_kind,
        chunk_label = excluded.chunk_label,
        section_label = excluded.section_label,
        page_start = excluded.page_start,
        page_end = excluded.page_end,
        char_start = excluded.char_start,
        char_end = excluded.char_end,
        structural_flags = excluded.structural_flags
      `,
      [
        `${docId}:${chunk.chunkIndex}`,
        caseId,
        docId,
        chunk.chunkIndex,
        chunk.text,
        chunk.chunkKind,
        chunk.chunkLabel,
        chunk.sectionLabel,
        chunk.pageStart,
        chunk.pageEnd,
        chunk.charStart,
        chunk.charEnd,
        JSON.stringify(chunk.structuralFlags || []),
      ]
    );

    insertedCount += 1;
  }

  logDocumentPersistenceDiagnostic({
    event: "chunk_persist_complete",
    doc_id: docId,
    file: name || "(unnamed)",
    chunks_created: insertedCount,
  });

  return insertedCount;
}
