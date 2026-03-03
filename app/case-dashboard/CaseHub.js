// Path: /app/case-dashboard/CaseHub.js
"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../_components/Container";
import EmptyState from "../_components/EmptyState";
import PageTitle from "../_components/PageTitle";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

import NextActionsCard from "./NextActionsCard";

import { EVIDENCE_CATEGORIES, getEvidenceCategoryLabel } from "../_config/evidenceTags";

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [docs, setDocs] = useState([]);

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
    } catch {
      setCaseRecord(null);
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

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 42, fontWeight: 900 }}>Case Dashboard</div>
            <div style={{ marginTop: 6, fontWeight: 900, color: "#444" }}>
              {caseRecord.title || "Untitled case"}
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 18,
            background: "#fff",
            marginTop: 16,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>Documents</div>

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
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
              onClick={() => (window.location.href = `${ROUTES.documents}?caseId=${caseId}`)}
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
