<!-- PATH: /NEXT_SESSION_PROMPT_PDF_PHASE.md -->
<!-- DIRECTORY: / -->
<!-- FILE: NEXT_SESSION_PROMPT_PDF_PHASE.md -->
<!-- ACTION: CREATE NEW FILE OR FULL OVERWRITE -->

# THOXIE — NEXT SESSION PROMPT (PDF PHASE)

You are continuing work on the current THOXIE repo.

## Verified current state

Treat the following as already proven and working:

- DOCX upload works.
- DOCX full text is being stored in SQL.
- AI can read a DOCX back verbatim on screen.
- That verbatim readback is the acceptance proof that the document is AI-accessible from stored server data.

Because of that, **do not reopen or refactor the DOCX path unless a shared bug absolutely requires it**.

Assume the user is intentionally freezing the current DOCX implementation because it works.

## What is explicitly out of scope at the start of this session

Do **not** begin by changing:

- the working DOCX flow
- the existing direct readback behavior that already works for DOCX
- `app/_lib/rag/limits.js` just for the sake of touching it
- the AIChatbox visual UI
- general app redesign work
- scanned-PDF OCR as the first task

## Immediate objective

Implement the **same end-to-end behavior for a standard machine-readable PDF** that currently exists for DOCX:

1. upload PDF successfully
2. extract the full PDF text
3. store the full extracted PDF text in SQL
4. create chunk rows as needed for retrieval
5. keep document preview/list behavior intact
6. allow AI to read the stored PDF text back verbatim on screen when asked

The first target is **text-layer PDFs**, not scanned OCR PDFs.

## Required acceptance criteria

A machine-readable PDF is considered fixed only when all of the following are true:

1. the PDF uploads successfully
2. a `thoxie_document` row is created
3. `extracted_text` contains the full document text in SQL, not just a clipped preview
4. chunk rows are created in `thoxie_document_chunk`
5. the existing document/detail flow still works
6. chat can answer a prompt such as:
   - `read it back to me verbatim`
   - `show me the full stored text`
   - `give me the exact text from the database`
7. the response shown on screen proves the PDF text is AI-accessible
8. the working DOCX behavior still works after the PDF change

## Constraints

- Full file overwrites only
- No diff snippets
- No partial patch instructions
- Max 3 files per batch
- Every overwrite file must include commented headers:
  - PATH
  - DIRECTORY
  - FILE
  - ACTION
- Preserve visible UI behavior
- Preserve the current DOCX working path
- Prefer the smallest safe code change that achieves the PDF goal

## Required work order

### Step 1 — Inspect current files before changing anything

Inspect the current versions of these files first:

- `app/api/ingest/route.js`
- `app/api/chat/route.js`
- `app/_lib/documents/extractText.js`
- `app/api/documents/route.js`
- `src/components/AIChatbox.js`
- `app/_lib/rag/limits.js`

Do not assume any earlier handoff batch is already reflected in the repo unless the current files confirm it.

### Step 2 — Preserve the DOCX baseline

Before generating any overwrite, confirm that the existing code path that made DOCX work is left intact.

If a shared helper must be edited for PDF support, the change must be written so DOCX behavior is preserved.

### Step 3 — Solve machine-readable PDF full-text storage first

Focus first on the normal PDF extraction path.

Likely target areas:

- PDF extraction in `app/_lib/documents/extractText.js`
- ingest persistence in `app/api/ingest/route.js`
- direct readback behavior in `app/api/chat/route.js`

Do not jump to OCR or external services unless the specific test file is image-only.

### Step 4 — Only after text-layer PDFs work, decide whether scanned PDFs need a separate phase

If the standard PDF path is fixed, then create a separate follow-up plan for scanned PDFs / OCR.

Do not mix both problems together unless necessary.

## Implementation guidance

The likely failure modes to check for standard PDFs are:

- extracted PDF text is clipped before SQL storage
- PDF extraction falls back incorrectly or returns partial text
- ingest stores only preview-sized text instead of full text
- chat direct-text mode still truncates or reformats full document output
- chunking uses an indexed slice, but SQL storage should preserve the full extracted text

The correct model is:

- store **full extracted text** in SQL
- use a bounded indexing slice only for chunking/retrieval cost control if needed
- keep direct verbatim readback sourced from stored SQL text

## Deliverable format

When you propose code, provide overwrite-ready files only.

No prose-only pseudo-fixes.

If a file does not need to change, say so explicitly and do not include it in the overwrite batch.

## First concrete task for the session

Start by determining the smallest safe batch needed to make **machine-readable PDFs** behave like the already-working DOCX path.

The most likely first batch is one or more of:

- `app/_lib/documents/extractText.js`
- `app/api/ingest/route.js`
- `app/api/chat/route.js`

But confirm from the actual current repo before deciding.
