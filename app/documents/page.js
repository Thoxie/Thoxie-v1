"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
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

/*
  Stable minimal implementation.
  Avoids nested JSX return blocks that caused syntax failure.
*/

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

    refreshDocs();
  }, [caseId]);

  async function refreshDocs() {
    if (!caseId) return;
    const rows = await DocumentRepository.listByCaseId(caseId);
    setDocs(rows || []);
  }

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || !caseId) return;

    setBusy(true);
    try {
      await DocumentRepository.addFiles(caseId, files, { docType: uploadType });
      await refreshDocs();
    } catch (err) {
      alert(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleDelete(docId) {
    const ok = confirm("Delete this document?");
    if (!ok) return;

    setBusy(true);
    try {
      await DocumentRepository.delete(docId);
      await refreshDocs();
    } catch (err) {
      alert(err?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(docId) {
    const url = await DocumentRepository.getObjectUrl(docId);
    if (url) window.open(url, "_blank");
  }

  async function handleMove(docId, delta) {
    if (delta < 0) await DocumentRepository.moveUp(docId);
    else await DocumentRepository.moveDown(docId);

    await refreshDocs();
  }

  async function changeType(docId, newType) {
    await DocumentRepository.updateMetadata(docId, { docType: newType });
    await refreshDocs();
  }

  function formatBytes(n) {
    if (!n) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(1)} ${units[i]}`;
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Container style={{ flex: 1 }}>
        <PageTitle>{caseData?.title || "Documents"}</PageTitle>

        <TextBlock>
          Upload evidence and court documents. Files are stored in your browser.
        </TextBlock>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <SecondaryButton href={ROUTES.dashboard}>
            Back to Dashboard
          </SecondaryButton>

          <SecondaryButton href={`${ROUTES.preview}?caseId=${caseId}`}>
            Preview Packet
          </SecondaryButton>
        </div>

        <div style={{ marginTop: 20 }}>
          <strong>Upload</strong>
          <div style={{ marginTop: 8 }}>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
            >
              {DOC_TYPES.map(t => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>

            <input
              type="file"
              multiple
              onChange={handleUpload}
              disabled={busy}
              style={{ marginLeft: 10 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 30 }}>
          <strong>Uploaded Files</strong>

          {docs.length === 0 && (
            <div style={{ marginTop: 10 }}>No files yet.</div>
          )}

          {docs.map((d, idx) => (
            <div
              key={d.docId}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
                marginTop: 10
              }}
            >
              <div style={{ fontWeight: 800 }}>
                Exhibit {String.fromCharCode(65 + idx)} — {d.name}
              </div>

              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                {getTypeLabel(d.docType)} • {formatBytes(d.size)}
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => handleOpen(d.docId)}>Open</button>

                <button
                  onClick={() => {
                    const t = prompt("Change type:", d.docType || "evidence");
                    if (t) changeType(d.docId, t);
                  }}
                >
                  Change Type
                </button>

                <button onClick={() => handleMove(d.docId, -1)}>
                  ▲
                </button>

                <button onClick={() => handleMove(d.docId, 1)}>
                  ▼
                </button>

                <button
                  style={{ color: "red" }}
                  onClick={() => handleDelete(d.docId)}
                >
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
