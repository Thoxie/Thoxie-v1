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

function compactWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanLabel(value, maxLen = 140) {
  const cleaned = compactWhitespace(value).replace(/[:\-–—\s]+$/g, "");
  if (!cleaned) return "";
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
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

function parsePageNumber(line) {
  const value = String(line || "").trim();
  if (!value) return null;

  const pageMatch = value.match(/^page\s+(\d+)(?:\s+of\s+\d+)?$/i);
  if (pageMatch) return Number(pageMatch[1]);

  if (/^\d+\s*$/.test(value)) return Number(value);

  const dashedMatch = value.match(/^-+\s*(\d+)\s*-+$/);
  if (dashedMatch) return Number(dashedMatch[1]);

  return null;
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

function detectFlags(text) {
  const source = String(text || "");
  const flags = [];

  if (/^\s*(superior court|state of california|county of|case\s+(no\.?|number))/im.test(source)) {
    flags.push("caption");
  }
  if (/\bplaintiff\b|\bdefendant\b|\bpetitioner\b|\brespondent\b/i.test(source)) {
    flags.push("party_roles");
  }
  if (/\brequest(?:s|ed)? that\b|\bprayer for relief\b|\brelief requested\b|\basks? the court to\b|\bseeks?\b/i.test(source)) {
    flags.push("relief_language");
  }
  if (/\bexhibit\s+[a-z0-9]+\b|\battachment\s+[a-z0-9]+\b|\bappendix\s+[a-z0-9]+\b/i.test(source)) {
    flags.push("exhibit_marker");
  }
  if (
    /\bcode of civil procedure\b|\bcivil code\b|\bevidence code\b|\bfamily code\b|\bgovernment code\b|\bbusiness\s*&\s*professions code\b|§{1,2}\s*\d|\bsection\s+\d/i.test(
      source
    )
  ) {
    flags.push("authority_reference");
  }
  if (/^\s*(?:[ivxlcdm]+\.\s+|\d+\.\s+|[a-z]\.\s+)/im.test(source) || /^\s*\(?\d{1,3}[.)]\s+/m.test(source)) {
    flags.push("structured_numbering");
  }
  if (/\$\s?\d[\d,]*(?:\.\d{2})?/i.test(source)) {
    flags.push("money");
  }
  if (
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i.test(
      source
    )
  ) {
    flags.push("date");
  }

  return flags;
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
  let currentPage = 1;
  let sectionLabel = "";
  let blockStartChar = 0;
  let charCursor = 0;

  function flushCurrent() {
    const raw = trimBlock(current.join("\n"));
    if (!raw) {
      current = [];
      return;
    }

    const type = classifyBlockType(current);
    const firstLine = String(current[0] || "").trim();
    const nextSectionLabel =
      type === "heading" || type === "exhibit" ? cleanLabel(firstLine) : sectionLabel;

    blocks.push({
      text: raw,
      type,
      page: currentPage,
      charStart: blockStartChar,
      charEnd: blockStartChar + raw.length,
      sectionLabel: type === "caption" ? "Caption" : nextSectionLabel || "",
      structuralFlags: detectFlags(raw),
    });

    if (type === "heading" || type === "exhibit") {
      sectionLabel = cleanLabel(firstLine);
    }

    current = [];
  }

  for (const originalLine of lines) {
    const line = String(originalLine || "");
    const trimmed = line.trim();

    if (!trimmed) {
      if (current.length > 0) flushCurrent();
      charCursor += line.length + 1;
      blockStartChar = charCursor;
      continue;
    }

    if (isLikelyPageMarker(trimmed)) {
      if (current.length > 0) flushCurrent();

      const explicitPage = parsePageNumber(trimmed);
      currentPage = Number.isFinite(explicitPage) && explicitPage > 0 ? explicitPage : currentPage + 1;

      blocks.push({
        text: trimmed,
        type: "page_marker",
        page: currentPage,
        charStart: charCursor,
        charEnd: charCursor + trimmed.length,
        sectionLabel: sectionLabel || "",
        structuralFlags: ["page_marker"],
      });

      charCursor += line.length + 1;
      blockStartChar = charCursor;
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
      charCursor += line.length + 1;
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

    if (shouldFlush) {
      flushCurrent();
      blockStartChar = charCursor;
    }

    current.push(trimmed);
    charCursor += line.length + 1;
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

function normalizeChunkKind(blocks) {
  const types = new Set((blocks || []).map((b) => b?.type).filter(Boolean));

  if (types.has("caption")) return "caption";
  if (types.has("exhibit")) return "exhibit";
  if (types.has("heading")) return "heading";
  if (types.has("numbered_paragraph")) return "numbered_paragraph";
  if (types.has("signature")) return "signature";
  return "body";
}

function buildChunkLabel({ chunkIndex, pageStart, pageEnd, sectionLabel, chunkKind }) {
  const pageLabel =
    Number.isFinite(pageStart) && Number.isFinite(pageEnd)
      ? pageStart === pageEnd
        ? `p. ${pageStart}`
        : `pp. ${pageStart}-${pageEnd}`
      : "";

  const section = cleanLabel(sectionLabel);
  const parts = [];

  if (pageLabel) parts.push(pageLabel);
  if (section) parts.push(section);
  if (!section && chunkKind && chunkKind !== "body") parts.push(chunkKind);

  const core = parts.join(" | ").trim();
  return core || `section ${chunkIndex + 1}`;
}

function finalizeChunk({ text, chunkIndex, blocks }) {
  const value = trimBlock(text);
  if (!value) return null;

  const realBlocks = (blocks || []).filter((block) => block && block.type !== "page_marker");
  const pages = realBlocks.map((block) => Number(block.page)).filter((n) => Number.isFinite(n) && n > 0);
  const charStarts = realBlocks
    .map((block) => Number(block.charStart))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const charEnds = realBlocks
    .map((block) => Number(block.charEnd))
    .filter((n) => Number.isFinite(n) && n >= 0);

  const sectionLabel =
    realBlocks.find((block) => cleanLabel(block.sectionLabel))?.sectionLabel || "";

  const chunkKind = normalizeChunkKind(realBlocks);
  const structuralFlags = Array.from(
    new Set(realBlocks.flatMap((block) => (Array.isArray(block.structuralFlags) ? block.structuralFlags : [])))
  );

  const pageStart = pages.length ? Math.min(...pages) : null;
  const pageEnd = pages.length ? Math.max(...pages) : null;
  const charStart = charStarts.length ? Math.min(...charStarts) : null;
  const charEnd = charEnds.length ? Math.max(...charEnds) : null;

  return {
    text: value,
    chunkIndex,
    chunkKind,
    sectionLabel: cleanLabel(sectionLabel),
    pageStart,
    pageEnd,
    charStart,
    charEnd,
    structuralFlags,
    label: buildChunkLabel({
      chunkIndex,
      pageStart,
      pageEnd,
      sectionLabel,
      chunkKind,
    }),
  };
}

export function chunkText(text, opts = {}) {
  const chunkSize = opts.chunkSize ?? RAG_LIMITS.chunkSize;
  const overlap = opts.chunkOverlap ?? RAG_LIMITS.chunkOverlap;
  const returnObjects = !!opts.returnObjects;
  const normalized = normalizeText(text);

  if (!normalized.trim()) {
    logChunkDiagnostic({
      event: "chunk_skipped_empty_text",
      chunk_size: chunkSize,
      overlap,
      input_length: 0,
      chunks_created: 0,
      return_objects: returnObjects,
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
      return_objects: returnObjects,
    });
    return [];
  }

  const chunks = [];
  let currentText = "";
  let currentBlocks = [];

  function flushChunk() {
    const chunk = finalizeChunk({
      text: currentText,
      chunkIndex: chunks.length,
      blocks: currentBlocks,
    });

    if (chunk) chunks.push(chunk);
    currentText = "";
    currentBlocks = [];
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
    currentBlocks.push(block);

    const hardOverflow = currentText.length > chunkSize + Math.max(100, Math.floor(overlap / 2));
    if (hardOverflow) {
      flushChunk();

      if (blockText.length > chunkSize) {
        let start = 0;
        while (start < blockText.length) {
          const end = Math.min(start + chunkSize, blockText.length);
          const slice = trimBlock(blockText.slice(start, end));
          if (slice) {
            const longChunk = finalizeChunk({
              text: slice,
              chunkIndex: chunks.length,
              blocks: [
                {
                  ...block,
                  charStart:
                    Number.isFinite(block.charStart) && block.charStart >= 0 ? block.charStart + start : null,
                  charEnd:
                    Number.isFinite(block.charStart) && block.charStart >= 0 ? block.charStart + end : null,
                },
              ],
            });
            if (longChunk) chunks.push(longChunk);
          }
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
    const key = chunk.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      ...chunk,
      chunkIndex: deduped.length,
      label: buildChunkLabel({
        chunkIndex: deduped.length,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        sectionLabel: chunk.sectionLabel,
        chunkKind: chunk.chunkKind,
      }),
    });
  }

  logChunkDiagnostic({
    event: "chunk_completed",
    chunk_size: chunkSize,
    overlap,
    input_length: normalized.length,
    block_count: blocks.length,
    chunks_created: deduped.length,
    return_objects: returnObjects,
  });

  return returnObjects ? deduped : deduped.map((chunk) => chunk.text);
}
