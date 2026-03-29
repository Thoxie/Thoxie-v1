<!-- PATH: /README.md -->
<!-- DIRECTORY: / -->
<!-- FILE: README.md -->
<!-- ACTION: FULL OVERWRITE -->

# THOXIE

THOXIE is a server-backed California small-claims workflow application with document-grounded AI assistance.

## Source of truth

When documentation conflicts with current GitHub code or current Vercel behavior, trust the current code first.

Use this order of authority:

1. Current GitHub file contents and actual deployed behavior
2. `CURRENT_STATE.md`
3. `NEXT_SESSION_NOTES.md`
4. Older markdown notes, historical prompts, and stale local zips

## Canonical product surface

The root Next.js App Router app is the real product.

Treat the following as non-canonical unless the current root app explicitly imports or routes to them:

- root HTML mockups
- sibling prototype app directories
- historical generated artifacts
- older standalone surfaces replaced by current routes

## Current architecture

### Application
- Framework: Next.js App Router
- Product app: root `/app`
- Live AI chat UI: `src/components/AIChatbox.js`
- Canonical dashboard route: `/case-dashboard`
- Legacy compatibility route: `/dashboard` redirects to `/case-dashboard`

### Persistence
- Database: PostgreSQL
- Case table: `thoxie_case`
- Document table: `thoxie_document`
- Chunk table: `thoxie_document_chunk`
- File storage: Vercel Blob

### Ownership model
THOXIE now uses a browser-bound ownership model for case-scoped server data.

- The browser receives an HttpOnly owner cookie: `thoxie_owner_v1`
- `thoxie_case` stores:
  - `owner_token_hash`
  - `owner_claimed_at`
  - `owner_last_seen_at`
- Case-scoped server routes enforce ownership before serving or mutating data
- Legacy unowned cases can be claimed on first authorized server read

### Document pipeline
The document ingestion / extraction / retrieval pipeline is real and should be preserved.

Current flow:

1. upload file
2. store file in Vercel Blob
3. create/update `thoxie_document`
4. extract text when possible
5. store `extracted_text`
6. chunk text into `thoxie_document_chunk`
7. use stored document/chunk data for retrieval and chat grounding

### OCR behavior
THOXIE supports both direct extraction and OCR-oriented flows.

- Machine-readable files can populate `extracted_text` during ingest
- Scanned PDFs can be queued for external OCR when configured
- OCR retry exists for eligible PDFs
- OCR callback persists returned text and creates chunks
- Chat should rely on the server-loaded stored text/chunks, not client-sent document text

## Important contract decisions

### Dashboard routing
`/case-dashboard` is the real dashboard route.

`/dashboard` exists only as a compatibility alias and should not become a second state-owning dashboard again.

### Document list vs detail
Case-level document list responses must return metadata and preview text only.

Do not return full extracted document bodies in the list API.

Full extracted text belongs only in detail fetches where the client explicitly asks for a single document.

### Chat authority
The server is authoritative for case/document/chunk loading.

Do not make the client send full document text payloads the server can already load itself.

## What was cleaned up in the recent session

The recent cleanup session normalized the repo in the following areas:

- retired the split-brain legacy `/dashboard` implementation
- added browser-bound ownership to cases
- enforced ownership on case load, chat, document, upload, OCR-retry, and status routes
- normalized the document list/detail API contract
- corrected document deletion to use a real checked-out Postgres client transaction
- removed client-side chat payload duplication for document text
- fixed intake draft hydration drift
- updated start/print copy to match the server-backed product model

## Current priority

Cleanup, verification, and hardening come before new feature work.

The immediate product goal is to confirm that scanned PDFs can:

1. upload successfully
2. store text in SQL
3. create chunk rows
4. become visible to server-side chat grounding
5. remain protected by the ownership model

## Working rules for this repo

- Full file overwrites only
- No diff snippets
- No partial patch instructions
- Batches of 3 files maximum
- Every delivered file must include commented headers with:
  - PATH
  - DIRECTORY
  - FILE
  - ACTION
- Present overwrite files on screen only
- Preserve visible behavior while cleaning internals
- Do not redesign the UI
- Do not change the AI chatbot box UI

## Recommended next focus

If scanned PDFs are still not fully usable in chat, verify the chain in this order:

1. upload accepted
2. blob stored
3. `thoxie_document` row created
4. `ocr_status` correct
5. `extracted_text` persisted
6. chunk rows created
7. document detail API returns full text
8. chat loads stored docs/chunks from the server and answers from them
