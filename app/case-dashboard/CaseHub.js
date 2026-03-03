// Path: /app/case-dashboard/CaseHub.js
"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../_components/Container";
import EmptyState from "../_components/EmptyState";
import PageTitle from "../_components/PageTitle";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

import { DraftRepository } from "../_repository/draftRepository";
import { generateSmallClaimsDraft } from "../_lib/draftGenerator";
import { createDraftRecord } from "../_schemas/draftSchema";

import NextActionsCard from "./NextActionsCard";

import { EVIDENCE_CATEGORIES, getEvidenceCategoryLabel } from "../_config/evidenceTags";

/* ---------------------------
   Utility helpers (unchanged)
---------------------------- */

function safeStr(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function getInitialForm(caseRecord) {
  const jurisdiction = caseRecord?.jurisdiction || {};
  const claim = caseRecord?.claim || {};
  const parties = caseRecord?.parties || {};
  const addressParts = parties?.plaintiffAddressParts || {};

  return {
    caseNumber: safeStr(caseRecord?.caseNumber || ""),
    county: safeStr(jurisdiction?.county || ""),
    courtName: safeStr(jurisdiction?.courtName || ""),
    courtAddress: safeStr(jurisdiction?.courtAddress || ""),
    department: safeStr(jurisdiction?.department || ""),

    plaintiffName: safeStr(parties?.plaintiffName || ""),
    plaintiffPhone: safeStr(parties?.plaintiffPhone || ""),
    plaintiffEmail: safeStr(parties?.plaintiffEmail || ""),
    plaintiffAddressLine1: safeStr(addressParts?.line1 || ""),
    plaintiffAddressLine2: safeStr(addressParts?.line2 || ""),
    plaintiffCity: safeStr(addressParts?.city || ""),
    plaintiffState: safeStr(addressParts?.state || ""),
    plaintiffZip: safeStr(addressParts?.zip || ""),

    defendantName: safeStr(parties?.defendantName || ""),
    defendantType: safeStr(parties?.defendantType || "person"),
    defendantPhone: safeStr(parties?.defendantPhone || ""),
    defendantEmail: safeStr(parties?.defendantEmail || ""),
    defendantAddress: safeStr(parties?.defendantAddress || ""),

    claimType: safeStr(claim?.type || ""),
    claimAmount: safeStr(claim?.amount || ""),
    claimFacts: safeStr(claim?.facts || ""),
    reliefRequested: safeStr(claim?.reliefRequested || ""),
  };
}

/* ===============================
   COMPONENT
================================ */

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState(null);

  const evidenceBreakdown = useMemo(() => {
    const counts = {};
    let uncategorized = 0;

    for (const d of docs) {
      const cat = String(d?.evidenceCategory || "").trim();
      if (!cat) uncategorized += 1;
      const key = cat || "__uncat__";
      counts[key] = (counts[key] || 0) + 1;
    }

    const ordered = [];
    for (const c of EVIDENCE_CATEGORIES) {
      if (counts[c.key]) ordered.push({ key: c.key, label: c.label, count: counts[c.key] });
    }
    if (counts["__uncat__"]) ordered.push({ key: "__uncat__", label: "Uncategorized", count: counts["__uncat__"] });
    for (const key of Object.keys(counts)) {
      if (key === "__uncat__") continue;
      if (EVIDENCE_CATEGORIES.some((c) => c.key === key)) continue;
      ordered.push({ key, label: getEvidenceCategoryLabel(key), count: counts[key] });
    }

    return { ordered, uncategorized, total: docs.length };
  }, [docs]);

  useEffect(() => {
    try {
      const c = CaseRepository.getById(caseId);
      setCaseRecord(c || null);
      setForm(getInitialForm(c || null));
    } catch {
      setCaseRecord(null);
      setForm(getInitialForm(null));
    }

    DocumentRepository.listByCaseId(caseId).then((d) =>
      setDocs(Array.isArray(d) ? d : [])
    );
  }, [caseId]);

  function switchCase(newId) {
    if (!newId || newId === caseId) return;
    window.location.href = `/case-dashboard?caseId=${encodeURIComponent(newId)}`;
  }

  if (!caseRecord) {
    return (
      <Container>
        <PageTitle>Case Dashboard</PageTitle>
        <EmptyState
          title="Case not found"
          message="This caseId does not exist."
          ctaHref={ROUTES.dashboard}
          ctaLabel="Back to Case List"
        />
      </Container>
    );
  }

  if (!form) return null;

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.h1}>Case Dashboard</div>
            <div style={styles.sub}>
              <strong>{caseRecord.title || "Untitled case"}</strong>
            </div>
          </div>

          {/* Case selector preserved if your repo uses it elsewhere */}
        </div>

        {/* ===== DOCUMENTS CARD (Phase 1 expanded) ===== */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Documents</div>

          <div style={{ fontWeight: 800 }}>Evidence Files Uploaded: {docs.length}</div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#444" }}>
            Evidence categories (Phase 1):
          </div>

          {docs.length ? (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {evidenceBreakdown.ordered.map((row) => (
                <div key={row.key} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 13 }}>{row.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 900 }}>{row.count}</div>
                </div>
              ))}

              {evidenceBreakdown.uncategorized ? (
                <div style={{ marginTop: 8, fontSize: 13, color: "#8a0000", fontWeight: 900 }}>
                  Action: categorize {evidenceBreakdown.uncategorized} document(s) on the Documents page.
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 13, color: "#155724", fontWeight: 900 }}>
                  Good: all documents have categories.
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
              Upload documents to begin building a case-ready evidence map.
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button
              style={styles.button}
              onClick={() =>
                (window.location.href = `${ROUTES.documents}?caseId=${caseId}`)
              }
            >
              Upload / Tag Documents
            </button>
          </div>
        </div>

        <NextActionsCard caseRecord={caseRecord} docs={docs} />
      </div>
    </Container>
  );
}

/* ===============================
   STYLES
================================ */

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
  },

  h1: {
    fontSize: 42,
    fontWeight: 900,
  },

  sub: {
    marginTop: 4,
    fontWeight: 800,
    color: "#444",
  },

  caseSelectorBox: {
    textAlign: "right",
  },

  selectorLabel: {
    fontWeight: 800,
    fontSize: 13,
    marginBottom: 6,
  },

  selector: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "2px solid #111",
    fontWeight: 800,
  },

  card: {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 18,
    background: "#fff",
    marginTop: 16,
  },

  cardTitle: {
    fontWeight: 900,
    fontSize: 16,
    marginBottom: 10,
  },

  button: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
};
