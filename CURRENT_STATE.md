<!-- /CURRENT_STATE.md -->
<!-- ACTION: ADD -->

# THOXIE — CURRENT STATE

This file is the current source-of-truth summary for repo state and active debugging direction.

## Product reality

- THOXIE is server-backed
- Uses PostgreSQL + Vercel Blob
- Upload pipeline stores extracted text and chunks for AI retrieval
- App is not local-only

## Confirmed working paths

- DOCX upload -> extraction -> storage -> retrieval
- Text-native PDF upload -> extraction -> storage -> retrieval
- AI answered questions correctly for both a DOCX and a text PDF in the live app

## OCR status

- Earlier OCR failure referenced missing `@napi-rs/canvas`
- package.json and package-lock.json include `@napi-rs/canvas`
- Local Codespaces tests confirmed module install/resolution/import under Node 20
- Vercel redeploy removed the immediate missing-package blocker
- True OCR-only scanned-PDF validation is still not conclusively proven

## Current unresolved question

When a scanned-looking PDF shows:
- Extracted text: Yes
- Chunks: > 0
- AI readable: Yes
- Extraction method: PDF fallback parser
- OCR status: Not needed

we still need to determine whether:
1. the PDF has a true text layer,
2. parser fallback is accepting noisy/junk output,
3. or OCR branch detection needs improvement.

## Primary files relevant now

- `/app/_lib/documents/extractText.js`
- `/app/_lib/documents/pdfOcr.js`
- `/app/api/chat/route.js`

## Current best next step

Use live-app black-box testing first:
- one file at a time
- record document card status
- ask exact retrieval prompts
- only then decide whether to change parser gating, OCR routing, or chat retrieval
