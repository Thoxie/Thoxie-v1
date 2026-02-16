// Path: /app/_lib/filingGuidance.js

import CA_JURISDICTION from "../_config/jurisdictions/ca";
import { resolveSmallClaimsForms } from "./formRequirementsResolver";
import { getSC100DraftData } from "./sc100Mapper";

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
 * Beta checklist.
 * HARD RULE: do not remove existing guidance. We ADD deterministic items on top.
 * Output stays: string[]
 */
export function getChecklistForCase(caseRecord) {
  if (!caseRecord) return [];

  // Defendant guidance remains unchanged (backward compatibility).
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

  // Plaintiff-first: deterministic items first, then the existing generic checklist.
  const deterministic = getDeterministicPlaintiffChecklist(caseRecord);

  const generic = [
    "Confirm you are in the correct venue (county/court).",
    "Identify the correct small claims forms for your county/court (usually SC-100 for Plaintiff claim; some counties have local forms).",
    "Prepare your claim narrative: who, what happened, when, and the amount requested.",
    "Prepare your exhibits (contracts, receipts, invoices, messages, photos).",
    "Make copies as required (often: court + each defendant + you).",
    "File with the clerk (in-person / mail / eFile if your court supports it). Pay filing fee.",
    "Serve the defendant properly and on time (service rules & deadlines vary; confirm on your court site).",
    "Prepare a hearing outline (2–5 minutes opening, then evidence, then close)."
  ];

  // De-dupe while preserving order (deterministic items should lead).
  return dedupeStrings([...deterministic, ...generic]);
}

/* ----------------------- deterministic additions ----------------------- */

function getDeterministicPlaintiffChecklist(caseRecord) {
  const out = [];

  // SC-100 readiness (strongest filing blocker for plaintiff packet)
  try {
    const sc100 = getSC100DraftData(caseRecord || {});
    const missingRequired = Array.isArray(sc100?.missingRequired) ? sc100.missingRequired : [];
    if (missingRequired.length > 0) {
      out.push(
        `Complete SC-100 required fields (missing: ${missingRequired.slice(0, 6).join(", ")}${
          missingRequired.length > 6 ? ", …" : ""
        }).`
      );
    }
  } catch {
    // Keep checklist stable if mapper changes.
  }

  // Forms resolver: missing gating answers
  try {
    const forms = resolveSmallClaimsForms(caseRecord || {});
    const missingInfoQuestions = Array.isArray(forms?.missingInfoQuestions) ? forms.missingInfoQuestions : [];
    const required = Array.isArray(forms?.required) ? forms.required : [];
    const conditional = Array.isArray(forms?.conditional) ? forms.conditional : [];

    if (missingInfoQuestions.length > 0) {
      // show the first question to make it actionable without UI changes
      const firstQ = String(missingInfoQuestions[0] || "").trim();
      out.push(
        firstQ
          ? `Answer checklist question to finalize forms: "${firstQ}"`
          : "Answer checklist questions to finalize the forms list."
      );
    }

    if (required.length > 0) {
      const codes = required
        .map((f) => safe(f?.code))
        .filter(Boolean)
        .slice(0, 8);
      if (codes.length > 0) {
        out.push(`Confirm required forms packet: ${codes.join(", ")}.`);
      }
    }

    if (conditional.length > 0) {
      out.push("Review conditional forms triggered by your case details before filing/serving.");
    }
  } catch {
    // Keep checklist stable if resolver/config changes.
  }

  return out;
}

/* ----------------------- helpers ----------------------- */

function dedupeStrings(items) {
  const out = [];
  const seen = new Set();
  for (const raw of items) {
    const s = safe(raw);
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return s.trim();
}


