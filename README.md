<!-- /README.md -->
<!-- ACTION: OVERWRITE -->

# THOXIE (Thoxie-v1)

THOXIE is a server-backed legal decision-support product focused on small claims workflows and document-grounded AI assistance.

## Source of truth

When documentation conflicts with code, trust the code and `CURRENT_STATE.md`.

## Current architecture

- Framework: Next.js App Router
- Backend: server routes under `/app/api`
- Database: PostgreSQL
- File storage: Vercel Blob
- Document ingestion: server-side
- AI retrieval: stored extracted text + chunking in DB-backed flow

## What is currently working

- DOCX upload -> extraction -> storage -> retrieval
- Text-native PDF upload -> extraction -> storage -> retrieval
- AI can answer questions about working uploaded DOCX and text-PDF files

## What is not yet conclusively proven

- True OCR-only scanned PDF behavior
- Whether certain scanned-looking PDFs are using OCR or parser fallback
- Whether PDF text gating still needs tightening for image-heavy PDFs with noisy or hidden text layers

## Current priority

1. Validate true scanned-PDF behavior in the live app
2. Determine whether parser fallback is incorrectly classifying some scanned-looking PDFs as readable
3. Only then decide whether to modify OCR detection, parser gating, or retrieval behavior

## Development rules for this repo

- Full file overwrites only
- No diff snippets
- No partial patch instructions
- File deliveries in batches of 3 max
- Every delivered file must include commented headers with full path and action

## Key files

- `/app/_lib/documents/extractText.js`
- `/app/_lib/documents/pdfOcr.js`
- `/app/api/chat/route.js`

## Testing rule

Use the live app first for document pipeline validation before jumping into database or terminal investigation.

## Note

Some older root-level documentation may be outdated. Do not rely on older architecture notes that describe the app as local-only or browser-only.
