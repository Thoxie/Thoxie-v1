<!-- PATH: /CURRENT_STATE.md -->
<!-- DIRECTORY: / -->
<!-- FILE: CURRENT_STATE.md -->
<!-- ACTION: FULL OVERWRITE -->

# THOXIE — CURRENT STATE

This file is the current repo handoff for the active THOXIE implementation.

## Canonical app

THOXIE is the root Next.js App Router app in `/app`.

Treat the root app as the live product.
Do not treat older prototype material or historical notes as canonical unless the current root app imports or references them directly.

## Current product reality

THOXIE is currently a server-backed California small-claims workflow app with:

- PostgreSQL for structured case and document records
- Vercel Blob for document file storage
- server-side ownership controls for case access
- AI chat that can read stored evidence when the correct path is triggered

## Server-side document model

The active document stack is:

- `thoxie_case`
- `thoxie_document`
- `thoxie_document_chunk`

Ownership protection is cookie-backed and server-enforced.

`thoxie_case` includes ownership fields:
- `owner_token_hash`
- `owner_claimed_at`
- `owner_last_seen_at`

The browser receives an HttpOnly owner cookie:
- `thoxie_owner_v1`

## What is verified working

### DOCX
Status: working baseline and must be preserved.

Verified in live testing:
- DOCX upload works
- extracted DOCX text is stored in SQL
- chunk rows are created
- direct stored-text readback works when the prompt clearly targets stored extracted text
- the AI can answer from the uploaded DOCX content

### Machine-readable PDF
Status: working baseline and must be preserved.

Verified in live testing:
- machine-readable PDF upload works
- extracted PDF text is stored in SQL
- chunk rows are created
- direct stored-text readback works when the prompt clearly targets stored extracted text
- the AI can answer from the uploaded PDF content

## What changed in this session

### Upload transport
A blob-backed PDF upload path has been added so larger PDFs do not rely only on raw multipart request-body upload.

Current implementation now includes:

- client-side repository logic that can send larger PDFs through Blob first
- `app/api/blob-upload/route.js`
- ingest support for blob-finalize JSON documents in addition to multipart uploads
- private Blob readback inside ingest before extraction/persistence

### Persistence path
The active persistence model remains:

- full extracted text stored in `thoxie_document.extracted_text`
- chunks stored in `thoxie_document_chunk`
- metadata/list responses return preview-oriented fields
- detail/direct stored-text behavior remains server-backed

### OCR architecture
The OCR architecture is now split into two layers:

1. local inline OCR capability exists in the repo
2. external OCR handoff/callback flow is implemented in the app

The current production-oriented direction is external OCR, not inline scanned-PDF OCR.

## Scanned PDF / OCR reality right now

### What is working
Scanned-PDF detection is working.

Verified in live testing with image-only PDF test files:
- scanned-style PDFs upload successfully
- they are correctly classified as scanned/image-only PDFs
- they are not misclassified as normal PDF text-layer files
- the app correctly reports no machine-readable PDF text layer when that is true

### What is not yet working end to end
Scanned-PDF OCR completion is not working yet.

Current observed result:
- stored text remains zero
- chunk count remains zero
- AI readable remains no
- OCR stops at scanned-PDF detection instead of producing stored OCR text

### Why
The app is currently wired to use an external OCR service for scanned PDFs, but no real provider endpoint is configured yet.

Current repo behavior:
- inline scanned-PDF OCR is disabled in the live ingest path
- external OCR is only enabled when service URL + callback token + app URL are configured
- callback persistence is already implemented
- retry for scanned-PDF OCR is already implemented

## Current OCR status by layer

### Inline OCR
- code exists in the repo
- local OCR dependencies exist in the repo
- not the chosen production path
- currently disabled for the live ingest path for scanned PDFs

### External OCR
- dispatch architecture exists
- callback route exists
- retry route exists
- persistence of OCR results is implemented
- no real external OCR provider/service URL is configured yet

## Environment status known from this session

The following values were intentionally set in Vercel:
- `THOXIE_APP_URL`
- `THOXIE_OCR_CALLBACK_TOKEN`
- `THOXIE_OCR_PROVIDER`

The following are still not configured:
- `THOXIE_OCR_SERVICE_URL`
- `THOXIE_OCR_SERVICE_TOKEN`

That means scanned-PDF OCR is still not operational, even though the app-side OCR plumbing is present.

## Current top priority

The top priority is now:

**Integrate a real external OCR provider/service for scanned PDFs without regressing the already-working DOCX and machine-readable PDF paths.**

This is no longer a general retrieval-tuning session.
This is no longer a standard PDF extraction session.
This is specifically the external OCR integration phase.

## Hard constraints for the next session

- preserve working DOCX behavior
- preserve working machine-readable PDF behavior
- preserve the current upload transport split
- do not redesign the visible UI unless a tiny status/retry adjustment is absolutely required
- do not reopen broad chat retrieval work first
- do not replace the document persistence model
- prefer the smallest production-safe change

## Files that define the current OCR phase

Inspect these first before changing anything:

- `app/_repository/documentRepository.js`
- `app/api/blob-upload/route.js`
- `app/api/ingest/route.js`
- `app/api/ocr/callback/route.js`
- `app/api/ocr/retry/route.js`
- `app/_lib/documents/extractText.js`
- `app/_lib/documents/documentPersistence.js`
- `package.json`

## Bottom line

The app is now at this exact point:

- DOCX works
- machine-readable PDF works
- scanned PDF detection works
- scanned PDF OCR persistence path is implemented
- external OCR provider integration is the missing piece

