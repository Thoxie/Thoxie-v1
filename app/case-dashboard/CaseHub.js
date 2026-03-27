/* PATH: /app/case-dashboard/CaseHub.js */
/* DIRECTORY: /app/case-dashboard */
/* FILE: CaseHub.js */
/* ACTION: OVERWRITE */
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

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const resolvedCaseId = String(caseId || "").trim();

      if (!resolvedCaseId) {
        if (!cancelled) {
          setCaseRecord(null);
          setDocs([]);
          setError("Missing caseId.");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError("");
      }

      try {
        const loadedCase = await CaseRepository.loadById(resolvedCaseId);

        if (!loadedCase) {
          if (!cancelled) {
            setCaseRecord(null);
            setDocs([]);
            setError("This caseId does not exist.");
            setLoading(false);
          }
          return;
        }

        const rows = await DocumentRepository.listByCaseId(loadedCase.id);

        if (cancelled) return;

        setCaseRecord(loadedCase);
        setDocs(Array.isArray(rows) ? rows : []);
        setError("");
      } catch (err) {
        console.error("CASE HUB LOAD ERROR:", err);

        if (cancelled) return;

        setCaseRecord(null);
        setDocs([]);
        setError(err?.message || "Could not load this case.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading) {
    return (
      <Container>
        <PageTitle>Case Dashboard</PageTitle>
        <div style={{ padding: "18px 0", color: "#444" }}>Loading case…</div>
      </Container>
    );
  }

  if (!caseRecord) {
    return (
      <Container>
        <PageTitle>Case Dashboard</PageTitle>
        <EmptyState
          title="Case not found"
          message={error || "This caseId does not exist."}
          ctaHref={ROUTES.dashboard}
          ctaLabel="Back to Case List"
        />
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <CaseIdentityHeader caseRecord={caseRecord} />

        <div style={styles.card}>
          <div style={styles.cardTitle}>Documents</div>
          <div>Evidence Files Uploaded: {docs.length}</div>

          <div style={{ marginTop: 12 }}>
            <button
              style={styles.button}
              onClick={() =>
                (window.location.href = `${ROUTES.documents}?caseId=${encodeURIComponent(caseRecord.id)}`)
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
