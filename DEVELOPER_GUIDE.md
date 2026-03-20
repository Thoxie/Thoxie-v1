THOXIE DEVELOPER GUIDE (BETA)

1) Non-negotiables
- CA small claims only.
- No auth systems.
- No server-side persistence (no DB, no blob storage).
- Client-side data: IndexedDB/localStorage only.
- Paul overwrites complete files only. The AI must supply full file contents.

2) Workflow discipline (prevents “circling”)
- One step at a time. Do not give Step 2/3 until Step 1 output is reviewed.
- Max 3 files changed per batch.
- Prefer the smallest possible change that unblocks testing.
- When a Vercel build fails, treat the Vercel log as the source of truth for what the deployed commit is missing.

3) Node version baseline (Codespaces + Vercel)
- Required: Node 20.x.
- If Codespaces terminal drifts to Node 24+:
  - Fix Node BEFORE npm install/build (otherwise lockfile and deps can diverge).
  - Recommended workflow:
    - nvm install 20
    - nvm use 20
    - node -v (confirm v20.x)

4) Adding dependencies (how to avoid Vercel failures)
- If you add runtime deps (used by API routes or server-only libs):
  - They must be in dependencies (not devDependencies).
  - package-lock.json must be committed.
  - Vercel will fail if the repo commit does not include the deps/lock changes.

5) Document extraction (beta)
Target doc types for beta:
- PDF and OCR PDF
- DOCX
- Images (OCR)

Implementation notes:
- Server-only extractor lives at: /app/_lib/documents/extractText.js
- Runtime deps expected:
  - mammoth
  - pdf-parse
  - tesseract.js
- pdf-parse export shape varies. The extractor must support both:
  - function export
  - default export

Explicit non-goals for beta:
- XLSX/Excel ingestion is excluded.

6) Next development targets (in priority order)
A) Delete document in app
- Add a delete/trash icon per document row
- Delete from IndexedDB (DocumentRepository)
- Immediately update the list UI without refresh

B) Reset case
- Clear case + delete all docs (for testing from scratch)
- Must be available inside the app UI (no external accounts)

C) Test document parsing end-to-end
- Upload a PDF/DOCX/image
- Confirm extraction returns text
- Confirm the app can use extracted content for downstream steps (even if AI usage is minimal initially)

7) Git hygiene (avoid “push rejected / remote ahead” loops)
- Before pushing:
  - git fetch origin
  - git status -sb
  - If behind, use: git pull --rebase origin main
  - Then push: git push origin main

