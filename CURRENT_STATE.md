<!-- PATH: /CURRENT_STATE.md -->
<!-- DIRECTORY: / -->
<!-- FILE: CURRENT_STATE.md -->
<!-- ACTION: FULL OVERWRITE -->

# THOXIE — CURRENT STATE

This file is the current architecture and status handoff for the repo.

## Product reality

THOXIE is a server-backed California small-claims workflow app.

The canonical product is the root Next.js App Router app in `/app`.

The repo still contains legacy or prototype material, but that material should not be treated as the active product unless the current root app explicitly depends on it.

## Current architecture summary

### Server-side data model
- `thoxie_case`
- `thoxie_document`
- `thoxie_document_chunk`

### Storage
- PostgreSQL for structured case/document/chunk data
- Vercel Blob for uploaded file storage

### Ownership
Case-scoped server access now uses a browser-bound ownership model.

`thoxie_case` includes:
- `owner_token_hash`
- `owner_claimed_at`
- `owner_last_seen_at`

The browser receives an HttpOnly owner cookie:
- `thoxie_owner_v1`

### Route model
- `/case-dashboard` is canonical
- `/dashboard` is compatibility-only
- chat remains server-authoritative
- document APIs now follow list/detail separation
- upload and OCR retry are ownership-protected

## What was completed in the recent cleanup session

### 1. Legacy dashboard retirement
Completed:
- `/app/dashboard/page.js`

Result:
- the obsolete localStorage-only dashboard route was replaced with a compatibility redirect
- `/dashboard` no longer acts as a second real dashboard implementation

### 2. Ownership foundation
Completed:
- `/app/_lib/server/ensureSchema.js`
- `/app/_lib/server/caseService.js`
- `/app/api/case/save/route.js`

Result:
- cases can be claimed by a browser session
- save now respects ownership
- owner cookie is issued and refreshed

### 3. Ownership enforcement on reads/status/chat
Completed:
- `/app/api/case/load/route.js`
- `/app/api/rag/status/route.js`
- `/app/api/chat/route.js`

Result:
- case load is ownership-aware
- RAG status is ownership-aware
- chat is ownership-aware before loading server-side case/doc/chunk context

### 4. Document contract cleanup
Completed:
- `/app/api/documents/route.js`
- `/app/_repository/documentRepository.js`
- `/app/document-preview/page.js`

Result:
- document list responses now return metadata + `previewText`
- full `extractedText` is detail-only
- delete uses a checked-out Postgres client transaction
- preview UI still works without changing visible layout

### 5. Client/server boundary cleanup
Completed:
- `/app/_repository/caseRepository.js`
- `/app/intake-wizard/IntakeWizardClient.js`
- `/src/components/AIChatbox.js`

Result:
- local draft shape drift was corrected
- ownership conflicts are not silently hidden behind stale local data
- chat client stopped sending redundant document text to the server

### 6. Upload/OCR/start-route hardening
Completed:
- `/app/api/ingest/route.js`
- `/app/api/ocr/retry/route.js`
- `/app/start/page.js`

Result:
- upload now respects case ownership
- upload response contract matches document metadata expectations
- OCR retry is ownership-protected
- start page copy now reflects the server-backed beta model

### 7. Filing guidance print copy cleanup
Completed:
- `/app/filing-guidance/print/page.js`

Result:
- stale browser-local wording was removed
- print guidance copy now matches the real server-backed product model

## Feature / spec status

### Case persistence
Status: live

- cases are saved to Postgres
- the browser still keeps local active-case/draft convenience state
- server is the authority for persisted case records

### Ownership model
Status: live, needs continued verification

- owner cookie issued on save
- owner checks on case load, chat, documents, upload, OCR retry, and status routes
- service-to-service OCR callback remains callback-token authenticated rather than browser-authenticated

### Dashboard routing
Status: normalized

- `/case-dashboard` is canonical
- `/dashboard` is compatibility-only

### Document list/detail contract
Status: normalized

- list returns preview text, not full extracted text
- detail returns full extracted text when explicitly requested

### Chat/document authority
Status: normalized

- server loads authoritative case/document/chunk context
- client should no longer send document text payloads

### Plain text document ingestion
Status: expected live

Expected path:
- upload
- blob store
- `extracted_text`
- chunk persistence
- chat access through server-loaded context

### Scanned PDF ingestion
Status: architecture in place, must be revalidated end-to-end

Expected path:
- upload
- blob store
- if no text layer: queue external OCR when configured
- OCR callback persists returned text
- callback creates chunks
- chat uses server-loaded stored text/chunks

### OCR retry
Status: implemented, must be revalidated in deployment

- retry route exists
- retry is ownership-protected
- retry eligibility is status-based

### Root docs
Status: requires this overwrite

The older root markdown files described an earlier pre-ownership cleanup stage and should be overwritten with the current state.

## Highest-value next verification work

The most important next-session objective is still the scanned PDF path.

Verify this exact chain:

1. scanned PDF upload succeeds
2. blob is stored
3. document row is created
4. `ocr_status` is correct
5. OCR queue or retry fires when appropriate
6. callback returns text
7. `extracted_text` is stored in SQL
8. chunk rows are created in SQL
9. document detail API can read full text
10. chat can answer using server-loaded evidence

## Likely remaining failure points if scanned PDFs still break

- OCR environment variables missing or wrong
- external OCR service never calls back
- callback token mismatch
- callback stores text but fails to chunk
- chat path sees document rows but zero chunks
- deployment environment differs from local assumptions
- a current GitHub file diverged from the last overwrite issued

## Important repo handling rule

Do not treat older OCR-only debugging notes as the main plan.

The correct next move is:
- verify current code,
- verify scanned PDF end-to-end,
- fix only the remaining broken link in that chain.
