// Path: /app/documents/page.js
"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import SecondaryButton from "../_components/SecondaryButton";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

const DOC_TYPES = [
  { key: "evidence", label: "Evidence / Exhibit" },
  { key: "court_filing", label: "Court filing" },
  { key: "pleading", label: "Pleading / Court filing" },
  { key: "correspondence", label: "Correspondence" },
  { key: "photo", label: "Photo / Image" },
  { key: "other", label: "Other" }
];

function getTypeLabel(key) {
  const found = DOC_TYPES.find(t => t.key === key);
  return found ? found.label : "Evidence / Exhibit";
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <DocumentsInner />
    </Suspense>
  );
}

function DocumentsInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [caseData, setCaseData] = useState(null);
  const [docs, setDocs] = useState([]);
  const [uploadType, setUploadType] = useState("evidence");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!caseId) return;

    const c = CaseRepository.getById(caseId);
    setCaseData(c || null);

    refreshDocs(caseId);
  }, [caseId]);

  async function refreshDocs(id) {
    if (!id) return;
    const rows = await DocumentRepository.listByCaseId(id);
    setDocs(rows || []);
  }

  async function handleUpload(e) {
    const files = e?.target?.files;
    if (!files || !caseId) return;

    setBusy(true);
    try {
      await DocumentRepository.addFiles(caseId, files, { docType: uploadType });
      await refreshDocs(caseId);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleDelete(docId) {
    if (!window.confirm("Delete this document?")) return;
    setBusy(true);
    try {
      await DocumentRepository.delete(docId);
      await refreshDocs(caseId);
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(docId) {
    const url = await DocumentRepository.getObjectUrl(docId);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Container style={{ flex: 1 }}>
        <PageTitle>{caseData?.title || "Documents"}</PageTitle>

        <TextBlock>
          Upload evidence and court documents for this case.
        </TextBlock>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <SecondaryButton href={ROUTES.dashboard}>
            Back to Dashboard
          </SecondaryButton>

          <SecondaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(caseId || "")}`}>
            Preview Packet
          </SecondaryButton>
        </div>

        <div style={{ marginTop: 20 }}>
          <select value={uploadType} onChange={e => setUploadType(e.target.value)}>
            {DOC_TYPES.map(t => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>

          <input type="file" multiple onChange={handleUpload} disabled={busy} />
        </div>

        <div style={{ marginTop: 30 }}>
          {docs.map((d, idx) => (
            <div key={d.docId} style={{ border: "1px solid #eee", padding: 12, marginTop: 10 }}>
              <strong>Exhibit {String.fromCharCode(65 + idx)} — {d.name}</strong>
              <div style={{ fontSize: 12, color: "#666" }}>
                {getTypeLabel(d.docType)} • {d.mimeType || "file"}
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => handleOpen(d.docId)}>Open</button>
                <button onClick={() => handleDelete(d.docId)} style={{ marginLeft: 8 }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Container>
      <Footer />
    </main>
  );
}
