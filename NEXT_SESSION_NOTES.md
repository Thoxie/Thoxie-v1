<!-- PATH: /NEXT_SESSION_NOTES.md -->
<!-- DIRECTORY: / -->
<!-- FILE: NEXT_SESSION_NOTES.md -->
<!-- ACTION: FULL OVERWRITE -->

# NEXT SESSION NOTES

## Main objective

Continue from the current working baseline.

This is not a DOCX repair session.
This is not a UI redesign session.
This is not a broad rewrite session.

The current verified baseline is:

- DOCX upload works
- DOCX full text is stored in SQL
- AI can read a DOCX back verbatim on screen

That behavior proves DOCX is AI-accessible and should be preserved.

## Next priority

The next programming target is **machine-readable PDF** support with the same outcome as the working DOCX path.

Required end state:

1. upload PDF successfully
2. extract the full PDF text
3. store the full extracted text in SQL
4. create chunk rows in SQL
5. keep existing document preview/list behavior intact
6. allow chat to read the stored PDF text back verbatim on screen

## Explicit non-goals at session start

Do not begin by changing:

- the working DOCX implementation
- `app/_lib/rag/limits.js` unless a real shared requirement is proven
- the AIChatbox UI design
- scanned-PDF OCR as the first task
- unrelated cleanup work

## First inspection tasks next session

Before generating any overwrite batch, inspect the current versions of:

- `/app/_lib/documents/extractText.js`
- `/app/api/ingest/route.js`
- `/app/api/chat/route.js`
- `/app/api/documents/route.js`
- `/src/components/AIChatbox.js`
- `/app/_lib/rag/limits.js`
- `/README.md`
- `/CURRENT_STATE.md`
- `/NEXT_SESSION_NOTES.md`

If the current repo differs from any prior handoff assumption, work from the actual current file contents.

## Recommended work order

### 1. Preserve the working DOCX baseline

Treat DOCX as the known-good implementation.

Any shared helper change must be written so DOCX behavior is not regressed.

### 2. Fix the standard PDF path first

Do not start with OCR.

Focus first on machine-readable PDFs that already contain a text layer.

Likely first targets:

- `/app/_lib/documents/extractText.js`
- `/app/api/ingest/route.js`
- `/app/api/chat/route.js`

### 3. Confirm the storage model

The correct model is:

- full extracted PDF text stored in SQL
- bounded indexing/chunking allowed for retrieval cost control
- verbatim readback sourced from stored SQL text

### 4. Only after that, decide whether scanned PDFs need a separate OCR phase

Scanned PDFs are not the first task unless the user explicitly changes scope.

## Acceptance test for the next session

A normal PDF is considered fixed only when all of the following are true:

1. upload succeeds
2. `thoxie_document` row exists
3. `extracted_text` contains the full PDF text in SQL
4. `thoxie_document_chunk` rows exist
5. document detail path still works
6. chat can answer prompts like:
   - `read it back to me verbatim`
   - `show me the full stored text`
   - `give me the exact text from the database`
7. the on-screen answer proves the PDF is AI-accessible
8. DOCX still works after the PDF change

## Hard workflow rules

- Full file overwrites only
- No diff snippets
- No patch instructions
- No partial replacements
- Batches of 3 files maximum
- Every delivered file must include commented headers with:
  - PATH
  - DIRECTORY
  - FILE
  - ACTION
- Present overwrite-ready files only
- Preserve visible behavior
- Do not redesign the UI
- Do not change the AI chatbot box UI

## Avoid

- Reopening DOCX work without proof of regression
- Touching `limits.js` without a concrete need
- Mixing standard PDF work with scanned-PDF OCR too early
- Returning full `extractedText` in document list APIs
- Making the client send full document text that the server already loads
- Turning the session into a general architecture rewrite

## Bottom line for the next session

DOCX is the confirmed working baseline.

The next session should preserve that baseline and make **machine-readable PDFs** fully usable from upload all the way through verbatim AI readback from stored server data.
