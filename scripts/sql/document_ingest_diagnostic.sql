/* 4. PATH: scripts/sql/document_ingest_diagnostic.sql */
/* 4. FILE: document_ingest_diagnostic.sql */
/* 4. ACTION: OVERWRITE */

-- FILE: scripts/sql/document_ingest_diagnostic.sql
-- PURPOSE:
-- Primary diagnostic for upload-time extraction and chunk persistence.
-- Run this after uploading DOCX/PDF evidence to identify the failing layer:
--   1) extraction
--   2) extracted_text persistence
--   3) chunk creation
--   4) retrieval path assumptions

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

-- INTERPRETATION GUIDE
-- A) extracted_text_length = 0 AND chunk_count = 0
--    => extraction likely failed or returned empty text.
-- B) extracted_text_length > 0 AND chunk_count = 0
--    => text stored but chunk creation/persistence failed.
-- C) extracted_text_length > 0 AND chunk_count > 0
--    => ingestion succeeded; investigate retrieval/chat query behavior.
-- D) extracted_text_length = 0 AND chunk_count > 0
--    => data integrity issue (unexpected); inspect chunking input and DB writes.
