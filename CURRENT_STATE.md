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
Case-scoped server access uses a browser-bound ownership model.

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
- document APIs follow list/detail separation
- upload and OCR retry are ownership-protected

## Verified functional status

### DOCX path
Status: verified working.

Verified by live user test:

- DOCX upload works
- DOCX full extracted text is stored in SQL
- AI can read the document back verbatim on screen
- that verbatim output proves the stored document is AI-accessible

This is the current baseline and should be preserved.

### PDF path
Status: next active implementation target.

The next required behavior is the same end-to-end result for a standard machine-readable PDF:

- upload succeeds
- full text is extracted
- full extracted text is stored in `thoxie_document.extracted_text`
- chunk rows are created in `thoxie_document_chunk`
- chat can read the stored text back verbatim on screen

### Scanned PDF / OCR
Status: separate later phase.

Scanned PDF handling may still need OCR-oriented work, but that is not the first priority for the next session.

The next coding session should solve the normal text-layer PDF path first, then evaluate whether scanned PDFs need a separate follow-up phase.

## Current implementation rules

- preserve the working DOCX path
- do not make speculative DOCX changes
- do not touch `app/_lib/rag/limits.js` unless a real shared requirement is proven
- preserve the current direct readback behavior that already works for DOCX
- keep the UI stable
- prefer the smallest safe batch of code changes

## What the next session should inspect first

Before changing code, inspect the current versions of:

- `/app/_lib/documents/extractText.js`
- `/app/api/ingest/route.js`
- `/app/api/chat/route.js`
- `/app/api/documents/route.js`
- `/src/components/AIChatbox.js`
- `/app/_lib/rag/limits.js`

Do not assume older overwrite batches match the current repo unless the file contents confirm it.

## Highest-value next work

The most important next-session objective is now the standard PDF path.

Verify and, if needed, fix this exact chain:

1. PDF upload succeeds
2. blob is stored
3. document row is created
4. full extracted text is stored in SQL
5. chunk rows are created
6. document detail API can read full text
7. chat can answer from the stored PDF text and read it back verbatim

## Likely remaining failure points for PDFs

- extracted PDF text is clipped before SQL storage
- extraction fallback returns incomplete text
- ingest stores preview-sized text instead of full text
- chunking works from an indexable slice, but storage should still preserve full text
- chat direct-text mode still truncates or reformats full document output
- a previous handoff assumed file contents that no longer match the repo

## Important repo handling rule

Do not treat the project as if DOCX still needs to be solved.

DOCX is already the confirmed working baseline.

The correct next move is:
- preserve DOCX,
- inspect the current PDF-related files,
- fix the normal PDF path,
- then separately decide whether scanned/OCR PDFs need another phase.
