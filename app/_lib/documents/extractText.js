// Path: /app/_lib/documents/extractText.js

/**
 * Document Text Extraction Utility
 *
 * Converts uploaded files into plain text that the AI can analyze.
 * Supported formats (beta):
 *  - PDF
 *  - DOCX
 *  - XLSX
 *  - Images (PNG/JPG) via OCR
 *
 * This file does NOT run extraction automatically yet.
 * It provides the functions the upload pipeline will call.
 */

import pdf from "pdf-parse";
import mammoth from "mammoth";
import xlsx from "xlsx";
import Tesseract from "tesseract.js";

export async function extractTextFromFile(buffer, mimeType) {
  if (!buffer) return "";

  if (mimeType === "application/pdf") {
    return extractPDF(buffer);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDOCX(buffer);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return extractXLSX(buffer);
  }

  if (mimeType.startsWith("image/")) {
    return extractImage(buffer);
  }

  return "";
}

/**
 * PDF extraction
 */
async function extractPDF(buffer) {
  try {
    const data = await pdf(buffer);
    return data.text || "";
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
    return result.value || "";
  } catch {
    return "";
  }
}

/**
 * Excel extraction
 */
async function extractXLSX(buffer) {
  try {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    let text = "";

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      text += `\nSheet: ${sheetName}\n`;
      text += csv;
    });

    return text;
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
    return data.text || "";
  } catch {
    return "";
  }
}
