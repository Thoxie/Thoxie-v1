// Path: /app/_lib/filingGuidance.js

import CA_JURISDICTION from "../_config/jurisdictions/ca";

/**
 * Returns the best available court info:
 * - Prefer what was saved on the case
 * - Fill missing fields from CA jurisdiction config
 */
export function getCourtInfoFromCase(caseRecord) {
  const j = caseRecord?.jurisdiction || {};
  const county = (j.county || "").trim();
  const courtName = (j.courtName || "").trim();

  // Start with case values (highest priority)
  let out = {
    county: county || "(not set)",
    courtName: courtName || "(not set)",
    courtAddress: (j.courtAddress || "").trim() || "(not set)",
    clerkUrl: (j.clerkUrl || "").trim() || "",
    notes: (j.notes || "").trim() || ""
  };

  // Try to fill from CA config if county/courtName present
  try {
    const countyObj =
      CA_JURISDICTION?.counties?.find((c) => c.county === county) || null;

    if (countyObj?.courts?.length) {
      // Prefer exact name match; fallback to first court in that county
      const courtObj =
        countyObj.courts.find((ct) => ct.name === courtName) ||
        countyObj.courts[0];

      if (courtObj) {
        if (!out.courtName || out.courtName === "(not set)") out.courtName = courtObj.name;
        if (!out.courtAddress || out.courtAddress === "(not set)") out.courtAddress = courtObj.address || "(not set)";
        if (!out.clerkUrl) out.clerkUrl = courtObj.clerkUrl || "";
        if (!out.notes) out.notes = courtObj.notes || "";
      }
    }
  } catch {
    // Safe fallback: keep what we already have.
  }

  return out;
}

export function getRoleLabel(caseRecord) {
  return caseRecord?.role === "defendant" ? "Defendant" : "Plaintiff";
}

/**
 * Beta checklist. This stays generic for now, but we route output through a helper
 * so it becomes config-driven later without rewriting the UI.
 */
export function getChecklistForCase(caseRecord) {
  if (!caseRecord) return [];

  if (caseRecord.role === "defendant") {
    return [
      "Confirm the hearing date/time and department on your court notice.",
      "Prepare your defense story in 1–2 pages (timeline + key facts).",
      "Organize exhibits (contracts, receipts, photos, messages). Bring 3 copies if required.",
      "Check whether a written response is required in your county/court for your situation (varies).",
      "If you have witnesses, confirm availability and whether the court allows witness declarations.",
      "Arrive early with copies, an exhibit index, and a short outline of what you’ll tell the judge."
    ];
  }

  return [
    "Confirm you are in the correct venue (county/court).",
    "Identify the correct small claims forms for your county/court (usually SC-100 for Plaintiff claim; some counties have local forms).",
    "Prepare your claim narrative: who, what happened, when, and the amount requested.",
    "Prepare your exhibits (contracts, receipts, invoices, messages, photos).",
    "Make copies as required (often: court + each defendant + you).",
    "File with the clerk (in-person / mail / eFile if your court supports it). Pay filing fee.",
    "Serve the defendant properly and on time (service rules & deadlines vary; confirm on your court site).",
    "Prepare a hearing outline (2–5 minutes opening, then evidence, then close)."
  ];
}

