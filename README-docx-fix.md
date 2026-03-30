<!-- PATH: /README-docx-fix.md -->
<!-- DIRECTORY: / -->
<!-- FILE: README-docx-fix.md -->
<!-- ACTION: CREATE NEW FILE OR OVERWRITE IF IT ALREADY EXISTS -->

DOCX fix bundle

Overwrite these files in the repo root:

- app/_lib/rag/limits.js
- app/_lib/documents/extractText.js
- app/api/ingest/route.js
- app/api/chat/route.js
- src/components/AIChatbox.js

What this fixes

1. DOCX extracted text is stored in SQL without the old 180k-character storage cap.
2. DOCX text extraction no longer merges and deduplicates Mammoth outputs in a way that can drop repeated lines.
3. Retrieval chunking still uses a bounded indexable slice so indexing cost stays controlled.
4. Chat can return the full stored SQL text instead of truncating it to 24k/12k characters.
5. The client preserves verbatim direct-text responses instead of reformatting them.
6. Direct-text intent now catches prompts like "read it back", "verbatim", and "100%".

Suggested test after overwrite

1. Upload a DOCX.
2. Confirm the uploaded document shows textLength > 0 and hasStoredText/readableByAI on the server side.
3. In chat, ask one of these:
   - Read the uploaded DOCX back to me verbatim.
   - Show me the full stored text for <filename>.
   - Give me the exact text from the database for <filename>.

Known scope boundary for this bundle

- This bundle fixes DOCX extraction, SQL storage, and full readback.
- It does not yet replace the current upload transport for very large files.
