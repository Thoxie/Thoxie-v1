<!-- PATH: /NEXT_SESSION_NOTES.md -->
<!-- DIRECTORY: / -->
<!-- FILE: NEXT_SESSION_NOTES.md -->
<!-- ACTION: FULL OVERWRITE -->

# NEXT SESSION NOTES

## Main objective

Implement a real external OCR provider/service for scanned PDFs.

This is the next concrete phase.
Do not restart from DOCX.
Do not restart from standard machine-readable PDFs.
Do not start with chat retrieval tuning.

## Current verified baseline

The current known-good baseline is:

- DOCX upload works
- machine-readable PDF upload works
- extracted text is stored in SQL for those working formats
- chunk rows are created for those working formats
- direct stored-text readback works when the prompt clearly targets stored extracted text
- larger-PDF transport work has been added through a Blob-backed path
- scanned PDFs are now correctly detected as scanned/image-only when they truly lack a text layer

## What failed but narrowed the problem

Scanned/image-only PDFs now upload and are correctly classified, but OCR does not complete.

Observed scanned-PDF outcome:
- `Stored text: 0 chars`
- `Chunks: 0`
- `AI readable: No`
- `Extraction method: None`
- `OCR status: Scanned PDF detected`
- `empty_pdf_text_layer`

That means:

- upload transport is no longer the first blocker
- scanned-PDF detection works
- OCR dispatch/completion is the missing step

## Current repo reality

### Present in repo
- Blob-backed PDF upload path
- ingest support for blob-finalize documents
- shared document persistence helpers
- external OCR dispatch framework
- OCR callback route that writes OCR text and creates chunks
- OCR retry route for scanned PDFs
- local OCR code and dependencies as a non-primary path

### Not present in usable end-to-end form
- a real external OCR provider/service endpoint
- provider auth values
- a live configured `THOXIE_OCR_SERVICE_URL`

## Environment state known from the current session

Currently set:
- `THOXIE_APP_URL`
- `THOXIE_OCR_CALLBACK_TOKEN`
- `THOXIE_OCR_PROVIDER`

Currently blank / missing:
- `THOXIE_OCR_SERVICE_URL`
- `THOXIE_OCR_SERVICE_TOKEN`

Because of that, external OCR is still not configured in practice.

## Explicit next-session non-goals

Do not begin by:

- rewriting the DOCX flow
- rewriting the standard machine-readable PDF flow
- redesigning the upload UI
- redesigning the chat UI
- changing retrieval logic first
- switching the product direction back to inline scanned-PDF OCR
- performing broad architecture cleanup

## First inspection tasks next session

Before proposing any overwrite batch, inspect the current versions of:

- `app/_repository/documentRepository.js`
- `app/api/blob-upload/route.js`
- `app/api/ingest/route.js`
- `app/api/ocr/callback/route.js`
- `app/api/ocr/retry/route.js`
- `app/_lib/documents/extractText.js`
- `app/_lib/documents/documentPersistence.js`
- `package.json`
- `CURRENT_STATE.md`
- `NEXT_SESSION_NOTES.md`
- `NEXT_SESSION_PROMPT_PDF_PHASE.md`

Do not assume any older handoff note is still correct unless the current repo confirms it.

## Recommended work order

### 1. Keep the app vendor-agnostic
Do not hard-wire business logic all over the app to a single OCR vendor SDK.

Prefer one of these two patterns:

- a thin OCR adapter service outside the main app, or
- a narrow provider module boundary that the app calls through one shape

The app already expects a generic external HTTP OCR service.
Preserve that direction unless there is a strong reason not to.

### 2. Normalize the dispatch contract
The current ingest path and retry path do not send exactly the same OCR job payload.

Normalize the external OCR request contract so both initial ingest dispatch and retry dispatch send one stable shape.

Target fields should include:
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

### 3. Integrate the provider/service
Implement the real OCR provider/service so that:

- the app sends the scanned PDF job out
- the provider/service fetches or receives the file
- OCR runs externally
- the provider/service calls back to `/api/ocr/callback`
- the callback writes OCR text into `thoxie_document`
- the callback creates `thoxie_document_chunk` rows

### 4. Configure the missing env vars
After the provider exists, set:

- `THOXIE_OCR_SERVICE_URL`
- `THOXIE_OCR_SERVICE_TOKEN` if the provider requires bearer auth

Do not use fake placeholder values.

### 5. Test through retry first
The safest first proof is to retry a known scanned PDF that already uploaded successfully.

That avoids mixing provider integration debugging with another upload-path change.

## Callback contract to preserve

The callback route already supports:

Authentication:
- `x-thoxie-ocr-token` header, or
- `Authorization: Bearer ...`, or
- `callbackToken` in body

Body fields:
- `docId`
- `ocrJobId` optional but preferred
- `status` (`processing`, `completed`, `failed`)
- `ocrProvider` or `provider`
- `extractionMethod` (default `ocr`)
- `text` or `extractedText`
- `error` or `message`

Do not break this unless there is a very strong reason.

## Acceptance criteria for the external OCR phase

A scanned PDF is only considered fixed when all of the following are true:

1. image-only/scanned PDF upload succeeds
2. the file is correctly detected as scanned when no text layer exists
3. status moves to `queued_external`
4. provider/service completes OCR
5. callback writes non-zero `extracted_text`
6. chunk rows are created
7. the document becomes `AI readable: Yes`
8. direct stored-text readback works for that scanned file
9. DOCX still works
10. machine-readable PDF still works

## Test files to reuse

Use the existing scanned test files from this session rather than creating new moving targets unless needed.

The best immediate proof target is the cleaner image-only scanned test PDF that already triggered:

- scanned detection
- zero stored text
- zero chunks
- no AI readability

That file should become the first positive OCR-completion proof after provider integration.

## Hard delivery rules

- full-file overwrites only
- no diff snippets
- no partial edits
- no pseudo-patches
- no broad rewrites without necessity
- keep batches small
- preserve working behavior

## Bottom line for the next session

The next session should not waste time rediscovering the problem.

The problem is already narrowed:

**The app-side OCR plumbing exists.  
The missing piece is a real external OCR provider/service integration.**
