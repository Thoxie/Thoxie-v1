-- FILE: scripts/sql/document_chunk_integrity.sql
-- PURPOSE:
-- Secondary diagnostic focused on chunk integrity and parent-child consistency.
-- Helps confirm whether chunks exist for documents with stored extracted text.

SELECT
  d.doc_id,
  d.case_id,
  d.name,
  d.uploaded_at,
  LENGTH(COALESCE(d.extracted_text, '')) AS extracted_text_length,
  CASE
    WHEN LENGTH(COALESCE(d.extracted_text, '')) > 0 THEN 'yes'
    ELSE 'no'
  END AS has_extracted_text,
  COUNT(c.chunk_id) AS chunk_count,
  CASE
    WHEN LENGTH(COALESCE(d.extracted_text, '')) > 0 AND COUNT(c.chunk_id) = 0 THEN 'TEXT_BUT_NO_CHUNKS'
    WHEN LENGTH(COALESCE(d.extracted_text, '')) = 0 AND COUNT(c.chunk_id) > 0 THEN 'CHUNKS_WITHOUT_TEXT'
    WHEN LENGTH(COALESCE(d.extracted_text, '')) > 0 AND COUNT(c.chunk_id) > 0 THEN 'OK'
    ELSE 'NO_TEXT_NO_CHUNKS'
  END AS ingestion_status
FROM thoxie_document d
LEFT JOIN thoxie_document_chunk c
  ON c.doc_id = d.doc_id
GROUP BY
  d.doc_id,
  d.case_id,
  d.name,
  d.uploaded_at,
  d.extracted_text
ORDER BY d.uploaded_at DESC, d.name ASC
LIMIT 50;
