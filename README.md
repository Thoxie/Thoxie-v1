# THOXIE (Thoxie-v1)

AI-assisted small claims case preparation system.

---

## IMPORTANT

The source of truth for architecture is:

→ CURRENT_STATE.md

Do not rely on older documentation files if they conflict with code or CURRENT_STATE.md.

---

## WHAT THIS APP DOES

- Intake and case structuring
- Document upload and storage
- Text extraction and OCR
- AI-assisted analysis using stored evidence

---

## CORE FLOW

1. User uploads documents
2. Documents are processed server-side
3. Text is stored in database
4. AI retrieves from stored data

---

## KEY DIRECTORIES

- /app → main application (Next.js App Router)
- /app/api → backend routes
- /app/_lib → core logic (documents, OCR, DB)
- /app/documents → document UI + management
- /app/case-dashboard → case overview
- /app/api/ingest → document ingestion pipeline

---

## CURRENT STATUS

- DOCX + text-PDF ingestion working
- OCR for scanned PDFs currently broken
- Database-backed retrieval working
- Draft generation partially implemented

---

## DEVELOPMENT RULE

When in doubt:
→ trust the code
→ trust CURRENT_STATE.md

---
