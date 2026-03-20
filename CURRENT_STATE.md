# THOXIE — CURRENT STATE (SOURCE OF TRUTH)

This file reflects the actual live architecture of the application.
If any other documentation conflicts with this file, this file is correct.

---

## CORE ARCHITECTURE

- Framework: Next.js (App Router)
- Backend: Server routes under /app/api
- Database: PostgreSQL
- File Storage: Vercel Blob
- OCR + Extraction: Server-side pipeline
- AI: Document-grounded retrieval using stored chunks

---

## DATA FLOW (REAL)

1. User uploads document
2. /app/api/ingest/route.js:
   - stores file in Blob
   - extracts text via extractText.js
3. Text is saved in PostgreSQL:
   - document record
   - chunked into document_chunks
4. AI retrieves from database (NOT from raw files)

---

## DOCUMENT SUPPORT

WORKING:
- DOCX → extraction → DB → AI usable
- Text-based PDFs → extraction → DB → AI usable

PARTIAL:
- Scanned PDFs → routed to OCR but currently failing at runtime
- Images (PNG/JPEG) → OCR path exists but tied to same subsystem

---

## OCR PIPELINE

Location:
- extractText.js → routing logic
- pdfOcr.js → scanned PDF processing
- image OCR → Tesseract-based

Current issue:
- PDF OCR fails during rendering stage (pdf.js / DOMMatrix issue)
- OCR does not complete → no text stored → AI cannot access content

---

## CURRENT PRIORITY

1. Restore OCR for scanned PDFs
2. Ensure OCR output is stored in DB
3. Preserve existing ingestion + chunking pipeline

---

## IMPORTANT CONSTRAINTS

- Do NOT break DOCX or text-PDF flow
- Do NOT refactor ingestion pipeline
- OCR fix must integrate into existing pipeline

---

## REALITY CHECK

The app is:
- server-backed (NOT local-only)
- database-driven
- document-ingestion-first

Any documentation suggesting otherwise is outdated.

---
