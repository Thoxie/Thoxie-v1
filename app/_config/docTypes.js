// Path: /app/_config/docTypes.js
// Central list of allowed document types and friendly labels.
//
// Purpose:
// - Single source of truth for doc type keys & labels.
// - Used by Documents page, Packet, Preview, etc.
// - Simple helpers to map a key to a label.

export const DOC_TYPES = [
  { key: "evidence", label: "Evidence / Exhibit" },
  { key: "court_filing", label: "Court filing" },
  { key: "pleading", label: "Pleading / Court filing" },
  { key: "correspondence", label: "Correspondence" },
  { key: "photo", label: "Photo / Image" },
  { key: "other", label: "Other" }
];

/**
 * Return label for a key. If not found, return prettified key or fallback label.
 * Keeps UI consistent if older records lack docTypeLabel.
 */
export function getDocTypeLabel(key) {
  try {
    const k = String(key || "").trim().toLowerCase();
    if (!k) return "Evidence / Exhibit";
    const found = DOC_TYPES.find((d) => d.key === k);
    if (found) return found.label;
    // prettify fallback
    return k.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  } catch {
    return "Evidence / Exhibit";
  }
}
