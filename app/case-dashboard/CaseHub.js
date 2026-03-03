// Path: /app/case-dashboard/CaseHub.js
"use client";

import { useEffect, useState } from "react";

import Container from "../_components/Container";
import EmptyState from "../_components/EmptyState";
import PageTitle from "../_components/PageTitle";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

import NextActionsCard from "./NextActionsCard";
import CaseIdentityHeader from "./_components/CaseIdentityHeader";

/* ---------------------------
   Utility helpers (existing)
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

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [form, setForm] = useState(null);
  const [docs, setDocs] = useState([]);

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
        {/* NEW: Case identity header */}
        <CaseIdentityHeader caseRecord={caseRecord} />

        {/* Existing content continues */}
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

const styles = {
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
