-- FILE: scripts/sql/document_ingest_diagnostic.sql
-- PURPOSE:
-- Primary diagnostic for upload-time extraction and chunk persistence.
-- Run this after uploading a DOCX or PDF to confirm whether:
-- 1) the document row exists,
-- 2) extracted_text was stored,
-- 3) chunk rows were created,
-- 4) upload timestamps are being recorded.

SELECT
  d.doc_id,
  d.case_id,
  d.name,
  d.mime_type,
  d.size_bytes,
  d.doc_type,
  d.uploaded_at,
  LENGTH(COALESCE(d.extracted_text, '')) AS extracted_text_length,
  SUBSTRING(COALESCE(d.extracted_text, ''), 1, 500) AS extracted_text_preview,
  COUNT(c.chunk_id) AS chunk_count,
  MIN(c.created_at) AS first_chunk_created_at,
  MAX(c.created_at) AS last_chunk_created_at
FROM thoxie_document d
LEFT JOIN thoxie_document_chunk c
  ON c.doc_id = d.doc_id
GROUP BY
  d.doc_id,
  d.case_id,
  d.name,
  d.mime_type,
  d.size_bytes,
  d.doc_type,
  d.uploaded_at,
  d.extracted_text
ORDER BY d.uploaded_at DESC, d.name ASC
LIMIT 50;
