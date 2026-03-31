<!-- PATH: /README.md -->
<!-- DIRECTORY: / -->
<!-- FILE: README.md -->
<!-- ACTION: FULL OVERWRITE -->

# THOXIE

THOXIE is a server-backed California small-claims workflow application with document-grounded AI assistance.

## Source of truth

When documentation conflicts with the current repo code or actual deployed behavior, trust the current code first.

Use this order of authority:

1. current repo file contents and actual deployed behavior
2. `CURRENT_STATE.md`
3. `NEXT_SESSION_NOTES.md`
4. older notes, stale prompts, and historical zip outputs

## Canonical product surface

The root Next.js App Router app is the real product.

Treat the following as non-canonical unless the current root app explicitly imports or routes to them:

- root HTML mockups
- sibling prototype app directories
- generated historical artifacts
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
THOXIE uses a browser-bound ownership model for case-scoped server data.

- The browser receives an HttpOnly owner cookie: `thoxie_owner_v1`
- `thoxie_case` stores:
  - `owner_token_hash`
  - `owner_claimed_at`
  - `owner_last_seen_at`
- Case-scoped server routes enforce ownership before serving or mutating data
- Legacy unowned cases can be claimed on first authorized server read

## Document pipeline

The document ingestion / extraction / retrieval pipeline is real and should be preserved.

Current flow:

1. upload file
2. store file in Vercel Blob
3. create/update `thoxie_document`
4. extract text when possible
5. store `extracted_text`
6. chunk text into `thoxie_document_chunk`
7. use stored document/chunk data for retrieval and chat grounding

## Current verified status

### DOCX
Status: working and should be preserved.

Verified behavior:

- DOCX upload works
- DOCX full text is stored in SQL
- AI can read a DOCX back verbatim on screen
- that verbatim readback is the current proof that the document is AI-accessible

Do not reopen the DOCX path unless a shared bug absolutely requires it.

### PDF
Status: next priority.

The next implementation goal is to make a standard machine-readable PDF behave like the working DOCX path:

1. upload successfully
2. extract full text
3. store full extracted text in SQL
4. create chunk rows
5. allow AI to read the stored text back verbatim on screen

This phase is about text-layer PDFs first.

### Scanned PDF / OCR
Status: later phase after standard PDF is working.

Do not make scanned-PDF OCR the first task in the next coding session unless the user explicitly changes priorities.

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
- Present overwrite files on screen only unless the user asks otherwise
- Preserve visible behavior while cleaning internals
- Do not redesign the UI
- Do not change the AI chatbot box UI

## Recommended next focus

The immediate product goal is no longer DOCX.

DOCX is already functioning end-to-end.

The immediate goal is to make **machine-readable PDFs** fully usable in the same way:

1. upload accepted
2. blob stored
3. `thoxie_document` row created
4. full `extracted_text` persisted in SQL
5. chunk rows created
6. document detail can read the text
7. chat can read it back verbatim from stored server data

Only after that should the session move to scanned PDFs / OCR.
