# NEXT SESSION NOTES

## CURRENT FOCUS
Fix OCR for scanned PDFs.

---

## KNOWN ISSUE
- OCR fails during PDF rendering step
- Error related to DOMMatrix / pdf.js environment
- OCR never completes → no text stored

---

## OBJECTIVE
Restore OCR without breaking:
- DOCX pipeline
- text-based PDF extraction
- ingestion → DB → chunking flow

---

## DO NOT
- introduce large refactors
- replace entire ingestion system
- break working document types

---

## NEXT STEP
Analyze:
- pdfOcr.js
- extractText.js routing
- pdfjs-dist compatibility in Node/Vercel

---

