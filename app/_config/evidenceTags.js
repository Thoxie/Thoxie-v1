// Path: /app/_config/evidenceTags.js
// California Small Claims — Evidence categorization and “what this supports” tags.
// Client-side only. No DB, no external storage.

export const EVIDENCE_CATEGORIES = [
  { key: "contract", label: "Contract / Agreement" },
  { key: "performance", label: "Performance / Work Done" },
  { key: "breach", label: "Breach / What Went Wrong" },
  { key: "damages", label: "Damages / Money Owed" },
  { key: "communications", label: "Communications" },
  { key: "identity", label: "Parties / Identity" },
  { key: "timeline", label: "Timeline / Dates" },
  { key: "service", label: "Service / Notices" },
  { key: "other", label: "Other" }
];

export const EVIDENCE_SUPPORTS = [
  { key: "formation", label: "Agreement existed (offer/acceptance/terms)" },
  { key: "terms", label: "Key terms (price, scope, deliverables, deadlines)" },
  { key: "payment", label: "Payment made / deposit paid" },
  { key: "performance_by_me", label: "I performed / delivered / completed work" },
  { key: "performance_by_them", label: "They performed (partial) / acknowledgments" },
  { key: "breach_nonpayment", label: "They didn’t pay / refused to pay" },
  { key: "breach_bad_work", label: "Poor quality / defective work / damage" },
  { key: "breach_nondelivery", label: "Did not deliver / did not show / canceled" },
  { key: "causation", label: "Their actions caused my loss" },
  { key: "damages_amount", label: "How much I’m owed (math/receipts/invoices)" },
  { key: "mitigation", label: "I tried to resolve / minimize losses" },
  { key: "notice", label: "I notified them / gave opportunity to fix" },
  { key: "timeline_dates", label: "Important dates (when/where it happened)" },
  { key: "identity_of_defendant", label: "Correct defendant identity (person/business)" },
  { key: "defenses_rebuttal", label: "Rebuttal to expected defenses" },
  { key: "collection", label: "Collection info (where they bank/work/assets)" }
];

export function getEvidenceCategoryLabel(key) {
  const k = String(key || "").trim().toLowerCase();
  const found = EVIDENCE_CATEGORIES.find((c) => c.key === k);
  return found ? found.label : "Uncategorized";
}

export function getEvidenceSupportLabel(key) {
  const k = String(key || "").trim().toLowerCase();
  const found = EVIDENCE_SUPPORTS.find((t) => t.key === k);
  return found ? found.label : k || "";
}
