/* PATH: app/_lib/rag/chunkText.js */
/* FILE: chunkText.js */
/* ACTION: OVERWRITE */

import { RAG_LIMITS } from "./limits";

function logChunkDiagnostic(payload = {}) {
  console.info(
    "UPLOAD_DIAGNOSTIC",
    JSON.stringify({
      scope: "chunkText",
      ...payload,
    })
  );
}

function normalizeText(input) {
  return String(input || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimBlock(value) {
  return String(value || "").replace(/\n{3,}/g, "\n\n").trim();
}

function isLikelyPageMarker(line) {
  const value = String(line || "").trim();
  if (!value) return false;

  return (
    value === "\f" ||
    /^page\s+\d+(\s+of\s+\d+)?$/i.test(value) ||
    /^\d+\s*$/.test(value) ||
    /^-+\s*\d+\s*-+$/.test(value)
  );
}

function isAllCapsHeading(line) {
  const value = String(line || "").trim();
  if (!value || value.length < 4 || value.length > 120) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (/[a-z]/.test(value)) return false;
  return /[A-Z]/.test(value.replace(/[^A-Z]/g, ""));
}

function isCaptionLine(line) {
  const value = String(line || "").trim();
  if (!value) return false;

  return (
    /^superior court/i.test(value) ||
    /^state of california/i.test(value) ||
    /^county of /i.test(value) ||
    /^case\s+(no\.?|number)\b/i.test(value) ||
    /^plaintiff\b/i.test(value) ||
    /^defendant\b/i.test(value) ||
    /^petitioner\b/i.test(value) ||
    /^respondent\b/i.test(value) ||
    /\bv\.\b/.test(value) ||
    /\bvs\.\b/i.test(value)
  );
}

function isExhibitLine(line) {
  const value = String(line || "").trim();
  return (
    /^exhibit\s+[a-z0-9]+[:.\- ]?/i.test(value) ||
    /^attachment\s+[a-z0-9]+[:.\- ]?/i.test(value) ||
    /^appendix\s+[a-z0-9]+[:.\- ]?/i.test(value)
  );
}

function isSectionHeading(line) {
  const value = String(line || "").trim();
  if (!value) return false;

  return (
    /^[IVXLC]+\.\s+/.test(value) ||
    /^\d+\.\s+/.test(value) ||
    /^[A-Z]\.\s+/.test(value) ||
    /^declaration of /i.test(value) ||
    /^request for /i.test(value) ||
    /^memorandum of /i.test(value) ||
    /^statement of /i.test(value) ||
    /^introduction\b/i.test(value) ||
    /^background\b/i.test(value) ||
    /^argument\b/i.test(value) ||
    /^facts\b/i.test(value) ||
    /^conclusion\b/i.test(value) ||
    /^prayer\b/i.test(value) ||
    /^relief requested\b/i.test(value) ||
    /^cause of action\b/i.test(value) ||
    /^count\s+\d+\b/i.test(value) ||
    isAllCapsHeading(value)
  );
}

function isNumberedParagraph(line) {
  const value = String(line || "").trim();
  return /^\(?\d{1,3}[.)]\s+/.test(value) || /^¶\s*\d+/.test(value);
}

function isSignatureLine(line) {
  const value = String(line || "").trim();
  return (
    /^dated[: ]/i.test(value) ||
    /^respectfully submitted/i.test(value) ||
    /^declarant$/i.test(value) ||
    /^signature$/i.test(value) ||
    /^attorney for /i.test(value)
  );
}

function classifyBlockType(lines) {
  const joined = trimBlock((lines || []).join("\n"));
  const first = String((lines || [])[0] || "").trim();

  if (!joined) return "body";
  if ((lines || []).some((line) => isLikelyPageMarker(line))) return "page_marker";
  if ((lines || []).every((line) => isCaptionLine(line))) return "caption";
  if (isExhibitLine(first)) return "exhibit";
  if (isSectionHeading(first)) return "heading";
  if (isNumberedParagraph(first)) return "numbered_paragraph";
  if (isSignatureLine(first)) return "signature";
  return "body";
}

function splitIntoBlocks(text) {
  const lines = normalizeText(text).split("\n");
  const blocks = [];
  let current = [];

  function flushCurrent() {
    const raw = trimBlock(current.join("\n"));
    if (!raw) {
      current = [];
      return;
    }

    blocks.push({
      text: raw,
      type: classifyBlockType(current),
    });
    current = [];
  }

  for (const originalLine of lines) {
    const line = String(originalLine || "");
    const trimmed = line.trim();

    if (!trimmed) {
      if (current.length > 0) flushCurrent();
      continue;
    }

    if (isLikelyPageMarker(trimmed)) {
      if (current.length > 0) flushCurrent();
      blocks.push({ text: trimmed, type: "page_marker" });
      continue;
    }

    const startsStandaloneBlock =
      current.length === 0 ||
      isCaptionLine(trimmed) ||
      isExhibitLine(trimmed) ||
      isSectionHeading(trimmed) ||
      isNumberedParagraph(trimmed) ||
      isSignatureLine(trimmed);

    if (!startsStandaloneBlock) {
      current.push(trimmed);
      continue;
    }

    const currentType = classifyBlockType(current);
    const nextType = classifyBlockType([trimmed]);
    const shouldFlush =
      current.length > 0 &&
      (currentType !== "caption" ||
        nextType !== "caption" ||
        isSectionHeading(trimmed) ||
        isExhibitLine(trimmed) ||
        isNumberedParagraph(trimmed) ||
        isSignatureLine(trimmed));

    if (shouldFlush) flushCurrent();
    current.push(trimmed);
  }

  if (current.length > 0) flushCurrent();

  return blocks;
}

function blockBoundaryBonus(type) {
  switch (type) {
    case "caption":
      return 120;
    case "heading":
    case "exhibit":
      return 90;
    case "numbered_paragraph":
      return 60;
    case "signature":
      return 40;
    default:
      return 0;
  }
}

export function chunkText(text, opts = {}) {
  const chunkSize = opts.chunkSize ?? RAG_LIMITS.chunkSize;
  const overlap = opts.chunkOverlap ?? RAG_LIMITS.chunkOverlap;
  const normalized = normalizeText(text);

  if (!normalized.trim()) {
    logChunkDiagnostic({
      event: "chunk_skipped_empty_text",
      chunk_size: chunkSize,
      overlap,
      input_length: 0,
      chunks_created: 0,
    });
    return [];
  }

  const blocks = splitIntoBlocks(normalized);
  if (blocks.length === 0) {
    logChunkDiagnostic({
      event: "chunk_skipped_no_blocks",
      chunk_size: chunkSize,
      overlap,
      input_length: normalized.length,
      chunks_created: 0,
    });
    return [];
  }

  const chunks = [];
  let currentText = "";

  function flushChunk() {
    const value = trimBlock(currentText);
    if (!value) {
      currentText = "";
      return;
    }

    chunks.push(value);
    currentText = "";
  }

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const blockText = trimBlock(block.text);
    if (!blockText || block.type === "page_marker") continue;

    const separator = currentText ? "\n\n" : "";
    const projectedLength = currentText.length + separator.length + blockText.length;
    const softLimit = Math.max(600, chunkSize - blockBoundaryBonus(block.type));

    if (currentText && projectedLength > softLimit) {
      flushChunk();
    }

    currentText += `${currentText ? "\n\n" : ""}${blockText}`;

    const hardOverflow = currentText.length > chunkSize + Math.max(100, Math.floor(overlap / 2));
    if (hardOverflow) {
      flushChunk();

      if (blockText.length > chunkSize) {
        let start = 0;
        while (start < blockText.length) {
          const end = Math.min(start + chunkSize, blockText.length);
          const slice = trimBlock(blockText.slice(start, end));
          if (slice) chunks.push(slice);
          if (end >= blockText.length) break;
          start = Math.max(0, end - overlap);
        }
      }
    }
  }

  flushChunk();

  const deduped = [];
  const seen = new Set();

  for (const chunk of chunks) {
    const key = chunk.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(chunk);
  }

  logChunkDiagnostic({
    event: "chunk_completed",
    chunk_size: chunkSize,
    overlap,
    input_length: normalized.length,
    block_count: blocks.length,
    chunks_created: deduped.length,
  });

  return deduped;
}
