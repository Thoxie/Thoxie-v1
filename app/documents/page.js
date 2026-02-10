// Path: /app/documents/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <DocumentsInner />
    </Suspense>
  );
}

function DocumentsInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);

  async function refreshDocs(id) {
    const rows = await DocumentRepository.listByCaseId(id);
    setDocs(rows);
  }

  useEffect(() => {
    if (!caseId) {
      setError("Missing caseId. Go to Dashboard → click “Documents.”");
      setC(null);
      return;
    }

    const found = CaseRepository.getById(caseId);
    if (!found) {
      setError("Case not found in this browser. Go back to Dashboard.");
      setC(null);
      return;
    }

    setError("");
    setC(found);
    refreshDocs(caseId);
  }, [caseId]);

  const headerLine = useMemo(() => {
    if (!c) return "";
    const county = c.jurisdiction?.county || "Unknown County";
    const role = c.role === "defendant" ? "Defendant" : "Plaintiff";
    const cat = c.category || "Uncategorized";
    return `${county} County — ${role} — ${cat}`;
  }, [c]);

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!caseId) return;

    setBusy(true);
    try {
      await DocumentRepository.addFiles(caseId, files);
      await refreshDocs(caseId);
    } catch (err) {
      alert(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
      // reset input so selecting same file again triggers onChange
      e.target.value = "";
    }
  }

  async function handleOpen(docId) {
    try {
      const url = await DocumentRepository.getObjectUrl(docId);
      if (!url) {
        alert("File not available.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      // Not revoking immediately because the new tab needs it.
      // Browser will eventually reclaim; later we can implement a safer revoke strategy.
    } catch (err) {
      alert(err?.message || "Could not open file.");
    }
  }

  async function handleDelete(docId) {
    const ok = window.confirm("Delete this uploaded document from this browser?");
    if (!ok) return;
    setBusy(true);
    try {
      await DocumentRepository.delete(docId);
      await refreshDocs(caseId);
    } catch (err) {
      alert(err?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  const card = {
    border: "1px solid #e6e6e6",
    borderRadius: "12px",
    padding: "14px 16px",
    background: "#fff",
    maxWidth: "920px"
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Documents & Evidence</PageTitle>

        <TextBlock>
          Upload evidence for this case (PDFs, photos, screenshots, contracts). Files are stored locally in this browser for now.
        </TextBlock>

        {headerLine && <div style={{ fontWeight: 900, marginTop: "6px" }}>{headerLine}</div>}

        {error ? (
          <div style={{ marginTop: "14px", color: "#b00020", fontWeight: 800 }}>{error}</div>
        ) : !c ? (
          <div style={{ marginTop: "14px" }}>Loading…</div>
        ) : (
          <>
            <div style={{ marginTop: "14px", ...card }}>
              <div style={{ fontWeight: 900, marginBottom: "8px" }}>Upload</div>

              <input
                type="file"
                multiple
                onChange={handleUpload}
                disabled={busy}
                style={{ display: "block", marginTop: "6px" }}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.heic"
              />

              <div style={{ marginTop: "10px", fontSize: "13px", color: "#666", lineHeight: 1.5 }}>
                You can upload:
                <ul style={{ marginTop: "6px" }}>
                  <li>Receipts, invoices, contracts</li>
                  <li>Photos of damage</li>
                  <li>Screenshots of texts/emails</li>
                  <li>Court notices (for later auto-extraction of hearing date/case number)</li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: "14px", ...card }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ fontWeight: 900 }}>Uploaded Documents</div>
                <div style={{ fontSize: "13px", color: "#666" }}>{docs.length} file(s)</div>
              </div>

              {docs.length === 0 ? (
                <div style={{ marginTop: "10px", color: "#666" }}>No documents uploaded yet.</div>
              ) : (
                <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
                  {docs.map((d) => (
                    <div
                      key={d.docId}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        background: "#fafafa"
                      }}
                    >
                      <div style={{ fontWeight: 900, wordBreak: "break-word" }}>{d.name}</div>
                      <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                        {d.mimeType || "file"} • {formatBytes(d.size)} • uploaded{" "}
                        {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : "(unknown)"}
                      </div>

                      <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <SecondaryButton
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpen(d.docId);
                          }}
                        >
                          Open
                        </SecondaryButton>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(d.docId)}
                          style={{
                            border: "1px solid #ddd",
                            background: "#fff",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontWeight: 800
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <PrimaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(caseId)}`}>
                Preview Packet
              </PrimaryButton>

              <SecondaryButton href={`${ROUTES.dashboard}`}>Back to Dashboard</SecondaryButton>

              <SecondaryButton href={`/intake-wizard?caseId=${encodeURIComponent(caseId)}`}>
                Edit Intake
              </SecondaryButton>
            </div>

            <div style={{ marginTop: "14px", fontSize: "12px", color: "#666", lineHeight: 1.5, maxWidth: "920px" }}>
              Note: because we’re not connected to the court, hearing date/time and case number will be entered manually or extracted from court PDFs later.
            </div>
          </>
        )}
      </Container>

      <Footer />
    </main>
  );
}

function formatBytes(n) {
  const num = Number(n || 0);
  if (!num) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = num;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

