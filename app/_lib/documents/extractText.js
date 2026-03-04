// Path: /app/_lib/documents/extractText.js

/**
 * Document Text Extraction Utility
 *
 * Converts uploaded files into plain text that the AI can analyze.
 * Supported formats (beta-safe):
 *  - PDF (text layer)
 *  - DOCX
 *  - Images (PNG/JPG) via OCR
 *  - CSV (recommended spreadsheet format for beta)
 *
 * Not supported in this beta phase:
 *  - XLSX parsing (removed due to high-severity vuln in npm `xlsx` with no fix available)
 */

import pdf from "pdf-parse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

export async function extractTextFromFile(buffer, mimeType, filename = "") {
  if (!buffer) return "";

  const mt = (mimeType || "").toLowerCase();
  const name = (filename || "").toLowerCase();

  if (mt === "application/pdf") {
    return extractPDF(buffer);
  }

  if (mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractDOCX(buffer);
  }

  // CSV: text/csv, application/csv, or filename ends with .csv
  if (mt === "text/csv" || mt === "application/csv" || name.endsWith(".csv")) {
    return extractCSV(buffer);
  }

  if (mt.startsWith("image/")) {
    return extractImage(buffer);
  }

  return "";
}

/**
 * PDF extraction (text layer only; OCR handled separately for images).
 */
async function extractPDF(buffer) {
  try {
    const data = await pdf(buffer);
    return (data && data.text) ? data.text : "";
  } catch {
    return "";
  }
}

/**
 * DOCX extraction
 */
async function extractDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result?.value || "";
  } catch {
    return "";
  }
}

/**
 * CSV extraction
 */
async function extractCSV(buffer) {
  try {
    // Buffer -> UTF-8 text
    const text = Buffer.from(buffer).toString("utf8");
    return text || "";
  } catch {
    return "";
  }
}

/**
 * OCR extraction for images
 */
async function extractImage(buffer) {
  try {
    const { data } = await Tesseract.recognize(buffer, "eng");
    return data?.text || "";
  } catch {
    return "";
  }
}
