<!-- PATH: /CURRENT_STATE.md -->
<!-- DIRECTORY: / -->
<!-- FILE: CURRENT_STATE.md -->
<!-- ACTION: FULL OVERWRITE -->

# THOXIE — CURRENT STATE

This file is the current working-status handoff for the repo.

## Product reality

THOXIE is a server-backed California small-claims workflow app.

The canonical product is the root Next.js App Router app in `/app`.

The repo still contains prototype and historical material, but that material should not be treated as the active product unless the current root app explicitly uses it.

## Current architecture summary

### Server-side data model
- `thoxie_case`
- `thoxie_document`
- `thoxie_document_chunk`

### Storage
- PostgreSQL for structured case, document, and chunk data
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
Status: sufficient for beta and should be preserved.

Verified by live user testing:
- DOCX upload works
- DOCX extracted text is stored in SQL
- chunk rows are created
- AI can answer targeted questions from uploaded DOCX content
- AI can read back stored DOCX text well enough to confirm server-side accessibility

DOCX may still have room for refinement later, but it is not the current implementation priority.

### Machine-readable PDF path
Status: sufficient for beta and should be preserved.

Verified by live user testing:
- machine-readable PDF upload works
- extracted PDF text is stored in SQL
- chunk rows are created
- AI can answer targeted questions accurately from uploaded PDF content
- AI can read back stored PDF text well enough to confirm server-side accessibility

The machine-readable PDF path should now be treated like DOCX: good enough for beta and frozen unless a confirmed regression is found.

### Scanned PDF / OCR
Status: later phase.

Scanned PDF handling may still need OCR-oriented work, but that is not the current priority.

## Current session reset point

The chat route has been restored to the original baseline file after unsuccessful attempts to modify retrieval/document scoping behavior.

Treat the current `app/api/chat/route.js` as the restored live baseline.

Do not assume any prior overwrite batch from the previous session is valid unless the current repo contents confirm it.

## Current implementation rules

- preserve the working DOCX path
- preserve the working machine-readable PDF path
- do not make speculative extractor changes
- do not change the visible UI
- do not start with OCR/scanned PDFs
- do not rewrite large shared files unless a confirmed bug requires it
- prefer the smallest safe change

## What the next session should inspect first

Before changing code, inspect the current versions of:

- `/app/api/chat/route.js`
- `/app/api/ingest/route.js`
- `/app/_lib/documents/extractText.js`
- `/app/api/documents/route.js`
- `/src/components/AIChatbox.js`
- `/app/_lib/rag/limits.js`

Do not assume older handoff batches match the current repo unless the file contents confirm it.

## Highest-value next work

The most important next-session objective is no longer PDF extraction.

The next technical objective is chat-side document scoping and retrieval behavior.

The next session should preserve the current DOCX/PDF upload-storage behavior and improve how chat uses stored evidence, especially:

1. selecting one intended document when the user is asking about one document
2. allowing multi-document behavior only when the user explicitly asks for all documents
3. improving exact quoting/readback behavior without broad route rewrites

## Important repo handling rule

Do not treat the project as if DOCX or machine-readable PDF still needs to be solved first.

Those paths are now the working baseline.

The correct next move is:
- preserve DOCX
- preserve machine-readable PDF
- inspect the current chat route baseline
- identify the narrowest safe retrieval/document-scoping improvement
- then implement only that change

