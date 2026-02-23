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

    hearingDate: safeStr(caseRecord?.hearingDate || ""),
    hearingTime: safeStr(caseRecord?.hearingTime || ""),
    checkInTime: safeStr(caseRecord?.checkInTime || ""),
    appearanceType: safeStr(caseRecord?.appearanceType || "In Person"),

    role: safeStr(caseRecord?.role || "Plaintiff"),
    claimType: safeStr(claim?.type || claim?.reason || ""),
    claimAmount: safeStr(claim?.amount ?? caseRecord?.damages ?? ""),
    incidentDate: safeStr(claim?.incidentDate || ""),

    fullName: safeStr(parties?.plaintiff || ""),
    phone: safeStr(parties?.plaintiffPhone || ""),
    email: safeStr(parties?.plaintiffEmail || ""),
    street: safeStr(addressParts.street || ""),
    city: safeStr(addressParts.city || ""),
    state: safeStr(addressParts.state || ""),
    zip: safeStr(addressParts.zip || ""),
  };
}

function saveCaseWithForm(caseRecord, form) {
  const next = { ...(caseRecord || {}) };

  next.caseNumber = safeStr(form.caseNumber);

  next.jurisdiction = {
    ...(caseRecord?.jurisdiction || {}),
    county: safeStr(form.county),
    courtName: safeStr(form.courtName),
    courtAddress: safeStr(form.courtAddress),
    department: safeStr(form.department),
  };

  next.hearingDate = safeStr(form.hearingDate);
  next.hearingTime = safeStr(form.hearingTime);
  next.checkInTime = safeStr(form.checkInTime);
  next.appearanceType = safeStr(form.appearanceType);

  next.role = safeStr(form.role);

  next.claim = {
    ...(caseRecord?.claim || {}),
    type: safeStr(form.claimType),
    amount: safeStr(form.claimAmount),
    incidentDate: safeStr(form.incidentDate),
  };

  next.damages = safeStr(form.claimAmount);

  next.parties = {
    ...(caseRecord?.parties || {}),
    plaintiff: safeStr(form.fullName),
    plaintiffPhone: safeStr(form.phone),
    plaintiffEmail: safeStr(form.email),
    plaintiffAddressParts: {
      street: safeStr(form.street),
      city: safeStr(form.city),
      state: safeStr(form.state),
      zip: safeStr(form.zip),
    },
  };

  return CaseRepository.save(next);
}

/* ===============================
   MAIN COMPONENT
================================ */

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [form, setForm] = useState(null);
  const [docs, setDocs] = useState([]);

  const [allCases, setAllCases] = useState([]);

  /* ---------- LOAD CASE LIST ---------- */

  useEffect(() => {
    try {
      const list = CaseRepository.listAll?.() || [];
      setAllCases(Array.isArray(list) ? list : []);
    } catch {
      setAllCases([]);
    }
  }, []);

  /* ---------- LOAD CURRENT CASE ---------- */

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

  /* ---------- CASE SWITCH HANDLER ---------- */

  function switchCase(newId) {
    if (!newId || newId === caseId) return;
    window.location.href = `/case-dashboard?caseId=${encodeURIComponent(newId)}`;
  }

  /* ---------- NO CASE ---------- */

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

  /* ===============================
     RENDER
  ================================ */

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>

        {/* ===== HEADER WITH CASE SELECTOR ===== */}

        <div style={styles.headerRow}>
          <div>
            <div style={styles.h1}>Case Dashboard</div>
            <div style={styles.sub}>Active Case</div>
          </div>

          <div style={styles.caseSelectorBox}>
            <div style={styles.selectorLabel}>Switch Case</div>

            <select
              value={caseId}
              onChange={(e) => switchCase(e.target.value)}
              style={styles.selector}
            >
              {allCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber
                    ? `${c.caseNumber}`
                    : `Case ${c.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== DOCUMENTS CARD (example existing content) ===== */}

        <div style={styles.card}>
          <div style={styles.cardTitle}>Documents</div>

          <div>Evidence Files Uploaded: {docs.length}</div>

          <div style={{ marginTop: 12 }}>
            <button
              style={styles.button}
              onClick={() =>
                (window.location.href = `${ROUTES.documents}?caseId=${caseId}`)
              }
            >
              Upload Documents
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
    fontSize: 20,
    marginBottom: 10,
  },

  button: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "2px solid #111",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
};
