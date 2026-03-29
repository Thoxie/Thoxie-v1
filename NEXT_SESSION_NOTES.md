<!-- PATH: /NEXT_SESSION_NOTES.md -->
<!-- DIRECTORY: / -->
<!-- FILE: NEXT_SESSION_NOTES.md -->
<!-- ACTION: FULL OVERWRITE -->

# NEXT SESSION NOTES

## Main objective

Continue from the cleaned server-backed architecture and verify the scanned-PDF path end-to-end.

This is not a redesign session.
This is not a UI rewrite session.
This is not a feature-sprawl session.

The most important remaining product question is:

Can a scanned PDF upload, produce searchable/stored text, create chunks in SQL, and become fully usable by server-side chat grounding?

## Current architectural baseline

Assume the user applied the recent overwrite batches exactly as issued, but always verify current GitHub/Vercel state before generating new code.

The intended current baseline is:

- `/case-dashboard` is canonical
- `/dashboard` is compatibility-only
- cases are server-backed
- documents and chunks are server-backed
- upload is server-backed
- document list/detail separation is normalized
- chat is server-authoritative
- ownership is browser-bound and case-scoped
- AIChatbox UI is unchanged visually

## Major files changed in the recent cleanup session

### Batch 1
- `/app/dashboard/page.js`

### Batch 2
- `/app/_lib/server/ensureSchema.js`
- `/app/_lib/server/caseService.js`
- `/app/api/case/save/route.js`

### Batch 3
- `/app/api/case/load/route.js`
- `/app/api/rag/status/route.js`
- `/app/api/chat/route.js`

### Batch 4
- `/app/api/documents/route.js`
- `/app/_repository/documentRepository.js`
- `/app/document-preview/page.js`

### Batch 5
- `/app/_repository/caseRepository.js`
- `/app/intake-wizard/IntakeWizardClient.js`
- `/src/components/AIChatbox.js`

### Batch 6
- `/app/api/ingest/route.js`
- `/app/api/ocr/retry/route.js`
- `/app/start/page.js`

### Batch 7
- `/app/filing-guidance/print/page.js`

### Root docs still need to reflect this session
- `/README.md`
- `/CURRENT_STATE.md`
- `/NEXT_SESSION_NOTES.md`

## First inspection tasks next session

Before proposing any new overwrite batch, inspect the current versions of:

- `/app/_lib/server/ensureSchema.js`
- `/app/_lib/server/caseService.js`
- `/app/api/case/save/route.js`
- `/app/api/case/load/route.js`
- `/app/api/documents/route.js`
- `/app/api/ingest/route.js`
- `/app/api/ocr/retry/route.js`
- `/app/api/ocr/callback/route.js`
- `/app/api/chat/route.js`
- `/app/api/rag/status/route.js`
- `/app/_repository/documentRepository.js`
- `/app/_repository/caseRepository.js`
- `/src/components/AIChatbox.js`
- `/app/start/page.js`
- `/app/document-preview/page.js`
- `/app/filing-guidance/print/page.js`
- `/README.md`
- `/CURRENT_STATE.md`
- `/NEXT_SESSION_NOTES.md`

If the next-session model does not have the exact current GitHub versions of files it plans to edit, it should ask the user to paste or upload those exact files before generating overwrite-ready replacements.

## Recommended next-session order of work

### 1. Verify current deployment/code state
Confirm that the cleanup files above are actually present in current GitHub/Vercel.

Do not assume the repo still matches the last overwrite batch if the user may have edited files manually.

### 2. Validate scanned PDF behavior end-to-end
Test these cases separately:

#### A. Machine-readable PDF
Expected:
- upload succeeds
- blob stored
- extracted text stored immediately
- chunks created immediately
- document preview list shows preview text
- document detail returns full extracted text
- chat can use the document from server-loaded context

#### B. Scanned PDF that needs external OCR
Expected:
- upload succeeds
- blob stored
- document row created
- `ocr_status` becomes `queued_external` when appropriate
- OCR callback returns text
- callback stores `extracted_text`
- callback creates chunks
- RAG status shows readable doc/chunks
- chat can use the document without client-sent doc text

#### C. OCR retry path
Expected:
- retry route only works for eligible PDFs
- retry respects ownership
- retry queues external OCR
- callback completes the document row and chunk rows

### 3. If scanned PDF is still broken, isolate the failure chain
Check in this order:

1. upload request/response
2. blob save
3. `thoxie_document` row
4. `ocr_status`
5. `ocr_job_id`
6. callback delivery
7. `extracted_text`
8. `thoxie_document_chunk` rows
9. document detail API
10. chat grounding

Do not jump straight to rewriting chat or UI code before identifying the first broken link.

## Likely remaining files to touch only if validation proves they need it

Highest-probability next targets if the scanned-PDF path still fails:

- `/app/api/ocr/callback/route.js`
- `/app/api/ingest/route.js`
- `/app/api/ocr/retry/route.js`
- `/app/api/chat/route.js`
- `/app/api/documents/route.js`
- `/app/documents/page.js`

## High-value environment/config checks

Verify deployed environment values if OCR still fails:

- `BLOB_READ_WRITE_TOKEN`
- Postgres connection env
- `THOXIE_OCR_SERVICE_URL`
- `THOXIE_OCR_CALLBACK_TOKEN`
- `THOXIE_APP_URL` or `NEXT_PUBLIC_APP_URL`
- optional `THOXIE_OCR_SERVICE_TOKEN`

## Helpful DB-level checks

If you need to debug with SQL, the most useful checks are:

### Document OCR state
`select doc_id, case_id, name, ocr_status, extraction_method, length(coalesce(extracted_text,'')) as text_len, ocr_job_id from thoxie_document order by uploaded_at desc limit 20;`

### Chunk state
`select doc_id, count(*) as chunk_count from thoxie_document_chunk group by doc_id order by chunk_count desc limit 20;`

### Case ownership
`select case_id, owner_token_hash is not null as has_owner from thoxie_case order by updated_at desc limit 20;`

## Hard workflow rules

- Full file overwrites only
- No diff snippets
- No patch instructions
- No “replace this section” edits
- Batches of 3 files maximum
- Every delivered file must include commented headers with:
  - PATH
  - DIRECTORY
  - FILE
  - ACTION
- Present files on screen only
- Preserve visible behavior
- Do not redesign the UI
- Do not change the AI chatbot box UI

## Avoid

- Reopening `/dashboard` as a second real dashboard
- Reintroducing full `extractedText` into case-level document lists
- Making the client send document text the server already loads
- Adding unauthenticated destructive case/document routes
- Turning the session into a broad rewrite
- Trusting stale markdown more than current code

## Bottom line for the next session

The repo cleanup baseline is no longer the main problem.

The main remaining question is whether scanned PDFs are now fully operational from upload all the way through chat grounding.

That should be verified first.
