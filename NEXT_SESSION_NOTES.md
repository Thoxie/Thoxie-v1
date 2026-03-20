<!-- /NEXT_SESSION_NOTES.md -->
<!-- ACTION: OVERWRITE -->

# NEXT SESSION NOTES

## Main objective

Determine whether scanned-looking PDFs are:
1. truly using OCR,
2. actually using parser fallback because they contain a text layer,
3. or being falsely classified as readable due to loose PDF gating.

## What is already proven

- DOCX upload works end-to-end
- Text-native PDF upload works end-to-end
- AI can answer questions from DOCX and text-PDF uploads
- `@napi-rs/canvas` is present in package.json and package-lock.json
- In Codespaces, after install, `@napi-rs/canvas` resolves correctly
- `app/_lib/documents/pdfOcr.js` imports successfully under Node 20
- Codespaces is now on Node 20.20.1

## What happened in prior debugging

- Initial scanned-PDF OCR failure showed:
  `missing_parser:Cannot find package '@napi-rs/canvas'`
- Local repo/module tests later showed the package is installable and resolvable
- This pointed to Vercel build/runtime state rather than repo structure
- After redeploy, a scanned-looking PDF showed:
  - Extracted text: Yes
  - Chunks: 12
  - AI readable: Yes
  - Extraction method: PDF fallback parser
  - OCR status: Not needed

## Important interpretation

That result does NOT prove OCR-only behavior is fixed.
It may mean the file has a real text layer or that parser gating is too permissive.

## Required first steps next session

1. Inspect current repo files before proposing changes:
   - `/app/_lib/documents/extractText.js`
   - `/app/_lib/documents/pdfOcr.js`
   - `/app/api/chat/route.js`

2. Verify whether `app/api/chat/route.js` currently includes:
   - `retrieveFromReadableDocsFinalFallback(documents)`
   - and the fallback call after `retrieveFromDocsFallback(...)`

3. Run controlled live-app tests using one file at a time.

## Live app test procedure

For each test file:
1. Upload only that file
2. Wait until processing finishes
3. Record:
   - Extracted text
   - Chunks
   - AI readable
   - Extraction method
   - OCR status

Then ask exactly:

- `Show the stored extracted text from [exact filename].`
- `What does the court order regarding arbitration fees and deadlines?`
- `Summarize [exact filename] in 5 bullet points.`

## Interpretation guide

- If stored extracted text is readable -> storage/retrieval likely works
- If stored extracted text is garbage -> parser gating may be too loose
- If doc card says readable/chunked but chat cannot retrieve it -> chat retrieval issue
- If OCR status says Not needed -> that file did not validate true OCR behavior

## Workflow rules

- Full file overwrites only
- No partial edits
- No replace-this-section instructions
- Batches of 3 files max
- Include full path + ACTION comment at top of every file
- One terminal command at a time when terminal is used

## Avoid

- Broad refactors
- Assumptions about file paths
- Assuming OCR is fixed without a true OCR-only file result
