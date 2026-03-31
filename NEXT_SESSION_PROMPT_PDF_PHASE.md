<!-- PATH: /NEXT_SESSION_PROMPT_PDF_PHASE.md -->
<!-- DIRECTORY: / -->
<!-- FILE: NEXT_SESSION_PROMPT_PDF_PHASE.md -->
<!-- ACTION: FULL OVERWRITE -->

# THOXIE — NEXT SESSION PROMPT (EXTERNAL OCR PHASE)

You are resuming THOXIE from a partially completed document-ingest/OCR integration effort.

Read this carefully before proposing any code.

## Current reality

The app’s normal DOCX path is working and must be preserved.
The app’s normal machine-readable PDF path is also working and must be preserved.
The app can store extracted text and chunks for those working formats.
Direct stored-text readback from SQL is working again when the prompt clearly triggers the stored-text path.

The current problem is **not** general chat retrieval.
The current problem is **not** standard PDF extraction.
The current problem is specifically:

**true scanned/image-only PDF uploads are detected correctly, but OCR is not completing because no real external OCR provider/service is integrated yet.**

## What is already known good

1. DOCX upload works well enough for beta.
2. Machine-readable PDF upload works well enough for beta.
3. Extracted text is stored in `thoxie_document.extracted_text` for those working formats.
4. Chunks are stored in `thoxie_document_chunk` for those working formats.
5. Direct stored-text readback works again when prompted correctly.
6. The visible UI should not be changed unless absolutely necessary.
7. Scanned/image-only PDFs are now correctly detected as scanned when they lack a usable text layer.

## What has already been changed and should be treated as current baseline unless the file contents prove otherwise

1. `app/_repository/documentRepository.js`
   - has a transport split
   - keeps multipart for ordinary uploads
   - sends larger PDFs through a Blob-backed upload path

2. `app/api/blob-upload/route.js`
   - exists
   - prepares client uploads to Blob for PDFs
   - is ownership-protected

3. `app/api/ingest/route.js`
   - supports multipart upload and blob-finalize JSON upload
   - can read private Blob files server-side
   - uses shared persistence helpers
   - preserves working DOCX and machine-readable PDF storage/chunking behavior
   - detects `empty_pdf_text_layer`
   - only queues external OCR when OCR config is enabled
   - currently keeps inline scanned-PDF OCR disabled

4. `app/api/ocr/callback/route.js`
   - exists
   - authenticates callback requests
   - writes OCR text into `thoxie_document`
   - creates chunks through shared persistence

5. `app/api/ocr/retry/route.js`
   - exists
   - can retry eligible scanned PDFs
   - dispatches OCR jobs externally when configured

6. `app/_lib/documents/extractText.js`
   - contains local OCR-related code and dependencies
   - contains scanned-PDF inline OCR capability
   - but ingest currently disables inline scanned-PDF OCR

## What failed operationally in this session

A true image-only/scanned PDF test now uploads successfully and is correctly classified as scanned, but OCR still does not complete.

Observed outcome:
- `Stored text: 0 chars`
- `Chunks: 0`
- `AI readable: No`
- `Extraction method: None`
- `OCR status: Scanned PDF detected`
- `empty_pdf_text_layer`

This means:
- transport is no longer the primary blocker for this test
- scanned-PDF detection is working
- OCR dispatch/completion is the missing piece

## Critical conclusion

The repo has an **external OCR architecture**, but it does **not** currently have a real external OCR provider/service configured.

Current environment reality from the prior session:
- `THOXIE_APP_URL` is set
- `THOXIE_OCR_CALLBACK_TOKEN` is set
- `THOXIE_OCR_PROVIDER` is set to `external_ocr`
- `THOXIE_OCR_SERVICE_URL` is not set
- `THOXIE_OCR_SERVICE_TOKEN` is not set

Therefore, external OCR is not yet operational.

## Primary objective

Implement a real external OCR provider/service integration for scanned PDFs **without breaking**:

- working DOCX uploads
- working machine-readable PDF uploads
- existing SQL storage/chunking behavior
- existing server-side document persistence model
- existing upload UI unless a tiny status/retry fix is absolutely required

## Important product direction

Do **not** default to the local inline OCR path as the production solution unless absolutely necessary.

The preferred direction is:

**external OCR provider/service for scanned PDFs**
with the app remaining as vendor-agnostic as possible.

A thin adapter service or narrow provider boundary is preferred over scattering vendor-specific logic throughout the app.

## What you must do first

Before writing code, inspect these current files:

- `app/_repository/documentRepository.js`
- `app/api/blob-upload/route.js`
- `app/api/ingest/route.js`
- `app/api/ocr/callback/route.js`
- `app/api/ocr/retry/route.js`
- `app/_lib/documents/extractText.js`
- `app/_lib/documents/documentPersistence.js`
- `package.json`

Trust the current file contents over any older notes.

## What you must determine before coding

1. What the cleanest provider-integration boundary should be
2. Whether to implement:
   - a thin external OCR adapter service, or
   - a narrow in-repo provider client that still preserves a generic job contract
3. How to normalize the OCR dispatch request so initial ingest and retry both send the same job shape
4. What minimal app changes are actually required after the provider/service exists

## Current OCR request/callback contract

### Current outbound OCR dispatch expectation
The app currently sends a JSON job to an external service URL.

Initial ingest dispatch currently includes a narrower set of fields than retry dispatch.
That inconsistency should be normalized.

The target normalized outbound job contract should include:
- `docId`
- `caseId`
- `name`
- `mimeType`
- `sizeBytes`
- `blobUrl`
- `ocrJobId`
- `ocrProvider`
- `callbackUrl`
- `callbackToken`
- `maxChars`

### Current callback route expectation
The callback route already supports:

Authentication:
- `x-thoxie-ocr-token` header, or
- `Authorization: Bearer ...`, or
- `callbackToken` in the body

Body:
- `docId`
- `ocrJobId` optional but preferred
- `status`
- `ocrProvider` or `provider`
- `extractionMethod`
- `text` or `extractedText`
- `error` or `message`

Do not break this contract unless there is a compelling reason.

## Required work order

### Step 1 — Inspect and confirm baseline
Confirm the current repo still reflects the above architecture.
Do not assume anything from older sessions if the files differ.

### Step 2 — Preserve the working baseline
Treat these as frozen unless a real shared bug requires change:

- DOCX ingest/storage path
- machine-readable PDF ingest/storage path
- existing SQL persistence model
- visible UI

### Step 3 — Choose and implement the provider integration pattern
Implement the real external OCR provider/service path.

The cleanest direction is usually:
- keep the app dispatching one generic OCR job
- let the provider adapter/service handle vendor-specific details
- keep callback completion writing text into SQL through the already-existing callback route

### Step 4 — Normalize the job payload
Make initial ingest dispatch and retry dispatch send the same OCR job structure.

### Step 5 — Configure environment only after the provider/service exists
Once the provider/service is real, configure:
- `THOXIE_OCR_SERVICE_URL`
- `THOXIE_OCR_SERVICE_TOKEN` if required

Do not use fake placeholder values.

### Step 6 — Prove the flow through retry first
Use a scanned PDF that already uploaded successfully and currently sits in a scanned/no-text state.

That is the safest proof target.

## Acceptance criteria

A scanned/image-only PDF is only considered fixed when all of the following are true:

1. upload succeeds
2. scan detection is correct
3. OCR status moves to `queued_external`
4. OCR provider/service completes successfully
5. callback writes non-zero `extracted_text`
6. `thoxie_document_chunk` rows are created
7. the document becomes AI-readable
8. direct stored-text readback works for that scanned file
9. DOCX still works
10. machine-readable PDF still works

## Explicit non-goals at session start

Do **not** begin by:

- rewriting chat retrieval logic
- redesigning the upload UI
- reopening standard PDF extraction work
- reopening DOCX work
- reverting the Blob-backed upload split
- replacing shared document persistence helpers
- turning this into a broad architecture rewrite

## Delivery rules

- Full file overwrites only
- No diffs
- No partial edits
- No pseudo-patches
- Keep changes narrow
- Prefer one file at a time if the change is substantial
- Explain the smallest safe next move before code if there is still uncertainty

## Bottom line

The app is past the “can it detect a scanned PDF?” phase.

It can.

The missing production piece is now:

**a real external OCR provider/service integration that feeds OCR text back into the already-implemented callback persistence path.**
