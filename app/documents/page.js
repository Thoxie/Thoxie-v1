/* PATH: app/documents/page.js */
/* FILE: page.js */
/* ACTION: FULL OVERWRITE */

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

import CaseIdentityHeader from "../case-dashboard/_components/CaseIdentityHeader";

import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_SUPPORTS,
  getEvidenceCategoryLabel,
  getEvidenceSupportLabel,
} from "../_config/evidenceTags";

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
  const [deletingId, setDeletingId] = useState("");

  const [noticeText, setNoticeText] = useState("");
  const [parseMsg, setParseMsg] = useState("");
  const [ocrMsg, setOcrMsg] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);

  const [statusMsg, setStatusMsg] = useState("");
  const [statusFiles, setStatusFiles] = useState([]);
  const [lastUploadReport, setLastUploadReport] = useState(null);

  const [descSavingId, setDescSavingId] = useState("");
  const [descSavedAt, setDescSavedAt] = useState({});

  const [docType, setDocType] = useState("evidence");

  const evidenceSummary = useMemo(() => {
    let uncategorized = 0;
    let aiReady = 0;
    let ocrCompleted = 0;
    let externalQueued = 0;
    let externalProcessing = 0;
    let externalFailed = 0;
    let scannedPdfNeedsAttention = 0;

    for (const d of docs) {
      const cat = String(d?.evidenceCategory || "").trim();
      const status = String(d?.ocrStatus || "").trim();

      if (!cat) uncategorized += 1;
      if (d?.readableByAI) aiReady += 1;
      if (status === "completed") ocrCompleted += 1;
      if (status === "queued_external") externalQueued += 1;
      if (status === "processing_external") externalProcessing += 1;
      if (status === "failed_external") externalFailed += 1;
      if (status === "needed_scanned_pdf") scannedPdfNeedsAttention += 1;
    }

    return {
      total: docs.length,
      uncategorized,
      aiReady,
      ocrCompleted,
      externalQueued,
      externalProcessing,
      externalFailed,
      scannedPdfNeedsAttention,
    };
  }, [docs]);

  async function refreshDocs(id) {
    const rows = await DocumentRepository.listByCaseId(id);
    setDocs(rows);
  }

  function flashStatus(msg, fileNames = []) {
    setStatusMsg(msg);
    setStatusFiles(fileNames);
    window.setTimeout(() => {
      setStatusMsg("");
      setStatusFiles([]);
    }, 9000);
  }

  function markDescSaved(docId) {
    try {
      const t = new Date();
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      const ss = String(t.getSeconds()).padStart(2, "0");
      setDescSavedAt((prev) => ({ ...prev, [docId]: `${hh}:${mm}:${ss}` }));
      window.setTimeout(() => {
        setDescSavedAt((prev) => {
          const next = { ...prev };
          delete next[docId];
          return next;
        });
      }, 6000);
    } catch {}
  }

  useEffect(() => {
    if (!caseId) {
      setError("Missing caseId. Go to Dashboard → click “Documents.”");
      setC(null);
      return;
    }

    setError("");
    const found = CaseRepository.getById(caseId);
    if (!found) {
      setError("Case not found. Go back to Dashboard.");
      setC(null);
      return;
    }

    setC(found);
    refreshDocs(caseId);
  }, [caseId]);

  const card = {
    border: "1px solid #e6e6e6",
    borderRadius: "14px",
    padding: "14px",
    background: "#fff",
  };

  async function handleUpload(e) {
    const files = e?.target?.files;
    if (!caseId) return;
    if (!files || files.length === 0) return;

    const names = Array.from(files)
      .map((f) => f?.name)
      .filter(Boolean);

    setBusy(true);
    setParseMsg("");
    setOcrMsg("");
    setNoticeText("");
    setLastUploadReport(null);

    try {
      const result = await DocumentRepository.addFiles(caseId, files, { docType });
      await refreshDocs(caseId);

      const uploaded = Array.isArray(result?.uploaded) ? result.uploaded : [];
      const failed = Array.isArray(result?.failed) ? result.failed : [];
      const uploadedReadable = uploaded.filter((x) => x?.readableByAI).length;
      const uploadedNames = uploaded.map((x) => x?.name).filter(Boolean);
      const queuedExternal = uploaded.filter((x) => String(x?.ocrStatus || "") === "queued_external").length;

      setLastUploadReport({ uploaded, failed });

      if (failed.length > 0 && uploaded.length > 0) {
        flashStatus(
          `Upload partially completed. ${uploaded.length} saved, ${failed.length} failed.`,
          [...uploadedNames, ...failed.map((x) => x?.name).filter(Boolean)]
        );
      } else if (failed.length > 0) {
        flashStatus(
          `Upload failed for ${failed.length} file${failed.length === 1 ? "" : "s"}.`,
          failed.map((x) => x?.name).filter(Boolean)
        );
      } else {
        flashStatus("Upload successful. Document(s) saved.", uploadedNames.length ? uploadedNames : names);
      }

      if (uploaded.length > 0) {
        let msg =
          `Saved ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}. ` +
          `${uploadedReadable} are immediately readable by AI.`;

        if (queuedExternal > 0) {
          msg +=
            ` ${queuedExternal} scanned PDF${queuedExternal === 1 ? "" : "s"} were queued for external OCR and will become AI-readable after processing completes.`;
        }

        msg +=
          ` Add evidence tags below (Category + What it supports) so your dashboard can show a case-ready evidence map.`;

        setParseMsg(msg);
      } else {
        setParseMsg("");
      }

      const uploadNotes = uploaded
        .map((x) => String(x?.extraction?.note || "").trim())
        .filter(Boolean);

      if (uploadNotes.length > 0) {
        setNoticeText(uploadNotes.join(" "));
      }
    } catch (err) {
      alert(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleOpen(docId) {
    try {
      const url = await DocumentRepository.getObjectUrl(docId);
      if (!url) return alert("Unable to open file.");
      window.open(url, "_blank");
    } catch (e) {
      alert(e?.message || "Unable to open file.");
    }
  }

  async function handleDelete(docId, name) {
    if (!docId) return;

    const confirmed = window.confirm(
      `Delete this uploaded file?\n\n${name || "Untitled document"}\n\nThis will remove the file, its stored extracted text, and its retrieval chunks.`
    );

    if (!confirmed) return;

    setDeletingId(docId);
    try {
      const result = await DocumentRepository.delete(docId);
      await refreshDocs(caseId);

      const deletedName = result?.deleted?.name || name || "Document";
      const warning = String(result?.blobWarning || "").trim();

      if (warning) {
        flashStatus(`Deleted record for ${deletedName}. Blob warning: ${warning}`, [deletedName]);
      } else {
        flashStatus(`Deleted ${deletedName}.`, [deletedName]);
      }
    } catch (err) {
      alert(err?.message || "Delete failed.");
    } finally {
      setDeletingId("");
    }
  }

  async function saveDocDescription(docId, text) {
    if (!docId) return;
    setDescSavingId(docId);
    try {
      await DocumentRepository.updateMetadata(docId, { exhibitDescription: text });
      markDescSaved(docId);

      if (caseId) {
        await refreshDocs(caseId);
      }

      flashStatus("Saved.");
    } catch (err) {
      alert(err?.message || "Save failed.");
    } finally {
      setDescSavingId("");
    }
  }

  async function setEvidenceCategory(docId, categoryKey) {
    if (!docId) return;
    try {
      await DocumentRepository.updateMetadata(docId, {
        evidenceCategory: String(categoryKey || ""),
      });
      await refreshDocs(caseId);
    } catch (err) {
      alert(err?.message || "Save failed.");
    }
  }

  async function toggleEvidenceSupport(docId, supportKey) {
    if (!docId) return;
    try {
      const current = await DocumentRepository.get(docId);
      const existing = Array.isArray(current?.evidenceSupports)
        ? current.evidenceSupports
        : [];
      const k = String(supportKey || "");
      const next = existing.includes(k)
        ? existing.filter((x) => x !== k)
        : [...existing, k];

      await DocumentRepository.updateMetadata(docId, { evidenceSupports: next });
      await refreshDocs(caseId);
    } catch (err) {
      alert(err?.message || "Save failed.");
    }
  }

  async function handleOcrImage() {
    setOcrMsg(
      "OCR is now handled in two stages: text-based documents are processed immediately during upload, and scanned PDFs can be queued for external OCR processing. OCR status now appears per document."
    );
    setOcrProgress(0);
    window.setTimeout(() => setOcrMsg(""), 4200);
  }

  const title = c?.title?.trim() ? c.title : "Documents";

  if (!caseId) {
    return (
      <main style={{ minHeight: "100vh" }}>
        <Header />
        <Container>
          <PageTitle>Documents</PageTitle>
          Missing caseId.
        </Container>
        <Footer />
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ minHeight: "100vh" }}>
        <Header />
        <Container>
          <PageTitle>Documents</PageTitle>

          <div style={{ ...card, borderColor: "#f5c6cb", background: "#fff5f6" }}>
            <div style={{ fontWeight: 900 }}>Error</div>
            <div style={{ marginTop: 6 }}>{error}</div>
            <div style={{ marginTop: 12 }}>
              <PrimaryButton href={ROUTES.dashboard}>Back to Dashboard</PrimaryButton>
            </div>
          </div>
        </Container>
        <Footer />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <PageTitle>{title}</PageTitle>

        {c ? <CaseIdentityHeader caseRecord={c} /> : null}

        <TextBlock>
          Upload evidence and court documents for this case. Files are stored server-side and can be
          opened or deleted from this page as you test and organize the matter.
        </TextBlock>

        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Evidence tagging progress</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#444" }}>
            Categorized:{" "}
            <strong>
              {evidenceSummary.total - evidenceSummary.uncategorized}/{evidenceSummary.total}
            </strong>
            {evidenceSummary.uncategorized ? (
              <span style={{ color: "#8a0000", fontWeight: 900 }}>
                {" "}
                • {evidenceSummary.uncategorized} need category
              </span>
            ) : (
              <span style={{ color: "#155724", fontWeight: 900 }}> • All documents categorized</span>
            )}
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#444" }}>
            AI-ready documents: <strong>{evidenceSummary.aiReady}</strong> / {evidenceSummary.total}
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#444" }}>
            OCR completed: <strong>{evidenceSummary.ocrCompleted}</strong> / {evidenceSummary.total}
            {evidenceSummary.scannedPdfNeedsAttention ? (
              <span style={{ color: "#8a0000", fontWeight: 900 }}>
                {" "}
                • {evidenceSummary.scannedPdfNeedsAttention} scanned PDF
                {evidenceSummary.scannedPdfNeedsAttention === 1 ? "" : "s"} need attention
              </span>
            ) : null}
          </div>

          {(evidenceSummary.externalQueued ||
            evidenceSummary.externalProcessing ||
            evidenceSummary.externalFailed) ? (
            <div style={{ marginTop: 6, fontSize: 13, color: "#444" }}>
              External OCR:{" "}
              <strong>{evidenceSummary.externalQueued}</strong> queued •{" "}
              <strong>{evidenceSummary.externalProcessing}</strong> processing •{" "}
              <strong>{evidenceSummary.externalFailed}</strong> failed
            </div>
          ) : null}
        </div>

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>Upload</div>

          {statusMsg ? (
            <div
              style={{
                marginTop: 10,
                border: "1px solid #cce5ff",
                background: "#f1f8ff",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 900 }}>{statusMsg}</div>
              {statusFiles?.length ? (
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {statusFiles.map((n) => (
                    <li key={n} style={{ fontSize: 13 }}>
                      {n}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {lastUploadReport ? (
            <div
              style={{
                marginTop: 12,
                border: "1px solid #e6e6e6",
                background: "#fafafa",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 900 }}>Last upload result</div>

              {lastUploadReport.uploaded?.length ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "#155724" }}>
                    Saved files ({lastUploadReport.uploaded.length})
                  </div>
                  <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}>
                    {lastUploadReport.uploaded.map((item) => (
                      <li key={`${item.docId}-${item.name}`} style={{ fontSize: 13, marginBottom: 8 }}>
                        <strong>{item.name}</strong>
                        <div style={{ color: "#555", marginTop: 2 }}>
                          Stored text: {Number(item?.storedTextLength || 0).toLocaleString()} chars •
                          Chunks: {Number(item?.chunkCount || 0).toLocaleString()} •
                          AI readable: {item?.readableByAI ? " Yes" : " No"}
                        </div>
                        <div style={{ color: "#555", marginTop: 2 }}>
                          Extraction method:{" "}
                          <strong>{formatExtractionMethod(item?.extraction?.method || item?.extractionMethod)}</strong>
                          {" • "}
                          OCR status: <strong>{formatOcrStatus(item?.ocrStatus)}</strong>
                        </div>
                        {item?.ocrProvider ? (
                          <div style={{ color: "#555", marginTop: 2 }}>
                            OCR provider: <strong>{item.ocrProvider}</strong>
                            {item?.ocrJobId ? <> • Job: <strong>{item.ocrJobId}</strong></> : null}
                          </div>
                        ) : null}
                        {item?.ocrError ? (
                          <div style={{ color: "#8a0000", marginTop: 2 }}>{item.ocrError}</div>
                        ) : null}
                        {item?.extraction?.note ? (
                          <div style={{ color: "#555", marginTop: 2 }}>{item.extraction.note}</div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {lastUploadReport.failed?.length ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "#8a0000" }}>
                    Failed files ({lastUploadReport.failed.length})
                  </div>
                  <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}>
                    {lastUploadReport.failed.map((item, idx) => (
                      <li key={`${item?.docId || "failed"}-${idx}`} style={{ fontSize: 13, marginBottom: 8 }}>
                        <strong>{item?.name || "Unnamed file"}</strong>
                        <div style={{ color: "#8a0000", marginTop: 2 }}>
                          {item?.error || "Upload failed"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontSize: 13, fontWeight: 900 }}>
              Default upload type:
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{ marginLeft: 10, padding: 8, borderRadius: 10, border: "1px solid #ddd" }}
                disabled={busy}
              >
                <option value="evidence">Evidence / Exhibit</option>
                <option value="correspondence">Correspondence</option>
                <option value="photo">Photo / Image</option>
                <option value="court_filing">Court filing</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px dashed #bbb",
                fontWeight: 900,
                cursor: busy ? "not-allowed" : "pointer",
                background: busy ? "#f3f3f3" : "#fff",
              }}
            >
              Select files
              <input
                type="file"
                multiple
                onChange={handleUpload}
                disabled={busy}
                style={{ display: "none" }}
              />
            </label>

            <SecondaryButton href={`${ROUTES.dashboard}?caseId=${encodeURIComponent(caseId || "")}`}>
              Back to Dashboard
            </SecondaryButton>

            <button
              onClick={handleOcrImage}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
              type="button"
            >
              OCR status help
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: "#555" }}>
            Current upload path uses multipart binary upload. Text-based files are processed immediately.
            Scanned PDFs can now be queued for external OCR and later become AI-readable after callback completion.
          </div>

          {parseMsg ? (
            <div style={{ marginTop: 12 }}>
              <TextBlock>{parseMsg}</TextBlock>
            </div>
          ) : null}

          {ocrMsg ? (
            <div style={{ marginTop: 12 }}>
              <TextBlock>{ocrMsg}</TextBlock>
              {ocrProgress ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
                  OCR progress: {ocrProgress}%
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>Uploaded Files</div>

          {docs.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#666" }}>No files yet.</div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {docs.map((d, idx) => {
                const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[idx] || `(${idx + 1})`;
                const exhibitLabel = `Exhibit ${letter}`;

                const savedTime = descSavedAt[d.docId];
                const isSaving = descSavingId === d.docId;
                const isDeleting = deletingId === d.docId;

                return (
                  <div
                    key={d.docId}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 1000, fontSize: "16px", lineHeight: 1.25 }}>
                      {exhibitLabel}
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 1000, fontSize: "16px" }}>
                      {d.name}
                    </div>

                    <div style={{ marginTop: "6px", fontSize: "12px", color: "#666" }}>
                      {d.mimeType || "file"} • {formatBytes(d.size)} • uploaded{" "}
                      {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : "(unknown)"}
                    </div>

                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                      Type: <strong>{d.docTypeLabel || formatDocTypeString(d.docType)}</strong>
                    </div>

                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                      Extracted text: <strong>{d.hasStoredText ? "Yes" : "No"}</strong> • Chunks:{" "}
                      <strong>{Number(d.chunkCount || 0).toLocaleString()}</strong> • AI readable:{" "}
                      <strong>{d.readableByAI ? "Yes" : "No"}</strong>
                    </div>

                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                      Extraction method: <strong>{formatExtractionMethod(d.extractionMethod)}</strong> • OCR status:{" "}
                      <strong>{formatOcrStatus(d.ocrStatus)}</strong>
                    </div>

                    {(d.ocrProvider || d.ocrJobId || d.ocrRequestedAt || d.ocrCompletedAt) ? (
                      <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                        {d.ocrProvider ? <>Provider: <strong>{d.ocrProvider}</strong></> : null}
                        {d.ocrProvider && d.ocrJobId ? " • " : null}
                        {d.ocrJobId ? <>Job: <strong>{d.ocrJobId}</strong></> : null}
                        {(d.ocrProvider || d.ocrJobId) && d.ocrRequestedAt ? " • " : null}
                        {d.ocrRequestedAt ? (
                          <>Requested: <strong>{new Date(d.ocrRequestedAt).toLocaleString()}</strong></>
                        ) : null}
                        {d.ocrCompletedAt ? (
                          <>
                            {" • "}Completed: <strong>{new Date(d.ocrCompletedAt).toLocaleString()}</strong>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {d.ocrError ? (
                      <div style={{ marginTop: "4px", fontSize: "12px", color: "#8a0000" }}>
                        OCR error: <strong>{d.ocrError}</strong>
                      </div>
                    ) : null}

                    {renderOcrNotice(d)}

                    <div style={{ marginTop: "10px", display: "grid", gap: 10 }}>
                      <div
                        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
                      >
                        <div style={{ fontSize: 12, color: "#666" }}>Evidence category:</div>
                        <select
                          value={String(d?.evidenceCategory || "")}
                          onChange={(e) => setEvidenceCategory(d.docId, e.target.value)}
                          style={{
                            padding: 8,
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            fontWeight: 900,
                            background: "white",
                            minWidth: 220,
                          }}
                          disabled={isDeleting}
                        >
                          <option value="">Uncategorized</option>
                          {EVIDENCE_CATEGORIES.map((c2) => (
                            <option key={c2.key} value={c2.key}>
                              {c2.label}
                            </option>
                          ))}
                        </select>

                        <div style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>
                          {d?.evidenceCategory ? (
                            <strong>{getEvidenceCategoryLabel(d.evidenceCategory)}</strong>
                          ) : (
                            <span style={{ fontWeight: 900, color: "#8a0000" }}>Needs category</span>
                          )}
                        </div>
                      </div>

                      <details
                        style={{
                          background: "white",
                          border: "1px solid #eee",
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        <summary style={{ cursor: "pointer", fontWeight: 900 }}>
                          What this document supports{" "}
                          <span style={{ fontWeight: 700, color: "#666" }}>
                            ({Array.isArray(d?.evidenceSupports) ? d.evidenceSupports.length : 0})
                          </span>
                        </summary>

                        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                          {EVIDENCE_SUPPORTS.map((t) => {
                            const currentSupports = Array.isArray(d?.evidenceSupports)
                              ? d.evidenceSupports
                              : [];
                            const checked = currentSupports.includes(t.key);

                            return (
                              <label
                                key={t.key}
                                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleEvidenceSupport(d.docId, t.key)}
                                  style={{ marginTop: 3 }}
                                  disabled={isDeleting}
                                />
                                <span style={{ fontSize: 13 }}>{t.label}</span>
                              </label>
                            );
                          })}
                        </div>

                        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                          Tip: keep these tags factual. They drive your dashboard’s evidence map and
                          readiness prompts.
                        </div>
                      </details>

                      <div style={{ fontSize: 12, color: "#555" }}>
                        Evidence summary:{" "}
                        <strong>{getEvidenceCategoryLabel(d?.evidenceCategory)}</strong>
                        {Array.isArray(d?.evidenceSupports) && d.evidenceSupports.length ? (
                          <>
                            {" "}
                            • Supports:{" "}
                            <span style={{ fontWeight: 700 }}>
                              {d.evidenceSupports.map(getEvidenceSupportLabel).join(", ")}
                            </span>
                          </>
                        ) : (
                          <>
                            {" "}
                            • Supports:{" "}
                            <span style={{ fontWeight: 700, color: "#8a0000" }}>
                              None tagged yet
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: "10px" }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                      >
                        <div style={{ fontWeight: 900, fontSize: "12px" }}>
                          Short description (for packet)
                        </div>

                        {savedTime ? (
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 900,
                              color: "#155724",
                              marginLeft: 6,
                            }}
                          >
                            Saved {savedTime}
                          </div>
                        ) : null}

                        <div
                          style={{
                            marginLeft: "auto",
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpen(d.docId);
                            }}
                            style={{
                              textDecoration: "none",
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #ddd",
                              background: "white",
                              fontWeight: 800,
                              color: "#111",
                              fontSize: 13,
                              pointerEvents: isDeleting ? "none" : "auto",
                              opacity: isDeleting ? 0.6 : 1,
                            }}
                          >
                            Open
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(d.docId, d.name)}
                            disabled={isDeleting}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #e0b4b4",
                              background: isDeleting ? "#f7f7f7" : "#fff5f5",
                              color: "#8a0000",
                              fontWeight: 800,
                              fontSize: 13,
                              cursor: isDeleting ? "not-allowed" : "pointer",
                            }}
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>

                      <textarea
                        defaultValue={d.exhibitDescription || ""}
                        placeholder="Example: Email from landlord dated March 2, 2026 attaching repair invoice."
                        rows={3}
                        disabled={isDeleting}
                        onBlur={(e) => saveDocDescription(d.docId, e.target.value)}
                        style={{
                          marginTop: 8,
                          width: "100%",
                          borderRadius: 12,
                          border: "1px solid #ddd",
                          padding: 10,
                          resize: "vertical",
                          fontFamily: "inherit",
                          fontSize: 13,
                          lineHeight: 1.4,
                          background: isDeleting ? "#f7f7f7" : "white",
                        }}
                      />

                      <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                        This description is shown in exhibit packets and summaries.
                        {isSaving ? (
                          <span style={{ marginLeft: 8, fontWeight: 900 }}>Saving...</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {noticeText ? (
          <div style={{ ...card, marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Notice</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#444" }}>{noticeText}</div>
          </div>
        ) : null}
      </Container>

      <Footer />
    </main>
  );
}

function renderOcrNotice(doc) {
  const status = String(doc?.ocrStatus || "").trim();

  if (!status) return null;

  if (status === "needed_scanned_pdf") {
    return (
      <div
        style={{
          marginTop: 8,
          border: "1px solid #f1c27d",
          background: "#fff8e8",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          color: "#6b4e00",
        }}
      >
        This PDF appears to be scanned and does not currently have a readable text layer stored for AI.
      </div>
    );
  }

  if (status === "queued_external") {
    return (
      <div
        style={{
          marginTop: 8,
          border: "1px solid #b8daff",
          background: "#eef7ff",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          color: "#0c5460",
        }}
      >
        Scanned PDF detected. External OCR has been queued. Searchable text will appear after processing completes.
      </div>
    );
  }

  if (status === "processing_external") {
    return (
      <div
        style={{
          marginTop: 8,
          border: "1px solid #b8daff",
          background: "#eef7ff",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          color: "#0c5460",
        }}
      >
        External OCR is currently processing this document.
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div
        style={{
          marginTop: 8,
          border: "1px solid #c3e6cb",
          background: "#f3fff5",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          color: "#155724",
        }}
      >
        OCR completed and stored.
      </div>
    );
  }

  if (status === "deferred_large_image") {
    return (
      <div
        style={{
          marginTop: 8,
          border: "1px solid #f1c27d",
          background: "#fff8e8",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          color: "#6b4e00",
        }}
      >
        OCR was deferred because the image file was too large for inline processing.
      </div>
    );
  }

  if (status === "failed_external") {
    return (
      <div
        style={{
          marginTop: 8,
          border: "1px solid #f5c6cb",
          background: "#fff5f6",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          color: "#8a0000",
        }}
      >
        External OCR did not complete successfully for this document.
      </div>
    );
  }

  if (status === "failed_timeout" || status === "failed_parse" || status === "failed_parser") {
    return (
      <div
        style={{
          marginTop: 8,
          border: "1px solid #f5c6cb",
          background: "#fff5f6",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          color: "#8a0000",
        }}
      >
        OCR/extraction was attempted but did not complete successfully.
      </div>
    );
  }

  return null;
}

function formatOcrStatus(value) {
  const s = String(value || "").trim();

  if (!s) return "Not recorded";

  switch (s) {
    case "completed":
      return "OCR completed";
    case "not_needed":
      return "Not needed";
    case "needed_scanned_pdf":
      return "Scanned PDF detected";
    case "needed_image_ocr":
      return "Image OCR needed";
    case "queued_external":
      return "Queued for external OCR";
    case "processing_external":
      return "Processing in external OCR";
    case "failed_external":
      return "External OCR failed";
    case "deferred_large_image":
      return "Deferred (large image)";
    case "failed_timeout":
      return "Failed (timeout)";
    case "failed_parse":
      return "Failed (parse)";
    case "failed_parser":
      return "Failed (parser)";
    case "not_applicable":
      return "Not applicable";
    default:
      return s.replace(/_/g, " ");
  }
}

function formatExtractionMethod(value) {
  const s = String(value || "").trim();

  if (!s) return "None";

  switch (s) {
    case "ocr":
      return "OCR";
    case "pdf-parse":
      return "PDF text layer";
    case "pdf2json":
      return "PDF fallback parser";
    case "docx":
      return "DOCX extractor";
    case "doc":
      return "Legacy DOC";
    case "none":
      return "None";
    default:
      return s;
  }
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDocTypeString(value) {
  const s = String(value || "").trim();
  if (!s) return "Unspecified";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
