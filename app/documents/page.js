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

/**
 * Defensive, self-contained doc-type list (keeps UI stable even if external file
 * is removed). Using an internal list avoids an extra dependency that could
 * cause runtime problems.
 */
const DOC_TYPES = [
  { key: "evidence", label: "Evidence / Exhibit" },
  { key: "court_filing", label: "Court filing" },
  { key: "pleading", label: "Pleading / Court filing" },
  { key: "correspondence", label: "Correspondence" },
  { key: "photo", label: "Photo / Image" },
  { key: "other", label: "Other" }
];

function getDocTypeLabel(key) {
  try {
    const k = String(key || "").trim().toLowerCase();
    if (!k) return "Evidence / Exhibit";
    const found = DOC_TYPES.find((d) => d.key === k);
    if (found) return found.label;
    return k.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  } catch {
    return "Evidence / Exhibit";
  }
}

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

  const [noticeText, setNoticeText] = useState("");
  const [parseMsg, setParseMsg] = useState("");
  const [ocrMsg, setOcrMsg] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);

  const [statusMsg, setStatusMsg] = useState("");
  const [statusFiles, setStatusFiles] = useState([]);

  const [descSavingId, setDescSavingId] = useState("");
  const [descSavedAt, setDescSavedAt] = useState({});

  // Inline type editor
  const [editingDocId, setEditingDocId] = useState(null);
  const [editingDocType, setEditingDocType] = useState("evidence");

  const [docType, setDocType] = useState("evidence");

  async function refreshDocs(id) {
    const rows = await DocumentRepository.listByCaseId(id);
    setDocs(rows || []);

    const toBackfill = (rows || []).filter((r) => !r.docTypeLabel);
    if (toBackfill.length > 0) {
      try {
        for (const r of toBackfill) {
          await DocumentRepository.updateMetadata(r.docId, { docType: r.docType || "evidence" });
        }
        const after = await DocumentRepository.listByCaseId(id);
        setDocs(after || []);
      } catch {
        // ignore
      }
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function handleUpload(e) {
    const files = e?.target?.files;
    if (!caseId || !files || files.length === 0) return;

    const names = Array.from(files).map((f) => f?.name).filter(Boolean);

    setBusy(true);
    setParseMsg("");
    setOcrMsg("");
    try {
      await DocumentRepository.addFiles(caseId, files, { docType });
      await refreshDocs(caseId);
      setParseMsg(
        "Uploaded. For searchable PDFs: Open → copy text → paste below → Parse & Fill. For scans: use OCR on an uploaded image (PNG/JPG)."
      );
      flashStatus("Upload successful. Document(s) saved.", names);
    } catch (err) {
      alert(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
      if (e?.target) e.target.value = "";
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
      flashStatus("Document deleted.");
    } catch (err) {
      alert(err?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(docId, delta) {
    if (!caseId) return;
    setBusy(true);
    try {
      if (delta < 0) await DocumentRepository.moveUp(docId);
      else await DocumentRepository.moveDown(docId);
      await refreshDocs(caseId);
      flashStatus("Reordered exhibit.");
    } catch (err) {
      alert(err?.message || "Reorder failed.");
    } finally {
      setBusy(false);
    }
  }

  function saveCourtNoticeTextToCase(text) {
    if (!c) return;
    const next = { ...c, courtNoticeText: text || "" };
    const saved = CaseRepository.save(next);
    setC(saved);
  }

  function applyParsedToCase(parsed) {
    if (!c) return;
    const next = { ...c };
    if (parsed.caseNumber) next.caseNumber = parsed.caseNumber;
    if (parsed.hearingDate) next.hearingDate = parsed.hearingDate;
    if (parsed.hearingTime) next.hearingTime = parsed.hearingTime;
    const saved = CaseRepository.save(next);
    setC(saved);
  }

  function handleParse() {
    if (!c) return;
    const parsed = parseCourtNoticeText(noticeText);
    applyParsedToCase(parsed);
    saveCourtNoticeTextToCase(noticeText);
    setParseMsg("Parsed and saved to case record.");
    flashStatus("Saved.");
  }

  async function saveDocDescription(docId, text) {
    if (!docId) return;
    setDescSavingId(docId);
    try {
      await DocumentRepository.updateMetadata(docId, { exhibitDescription: text });
      markDescSaved(docId);
      flashStatus("Saved.");
    } catch (err) {
      alert(err?.message || "Save failed.");
    } finally {
      setDescSavingId("");
    }
  }

  function openEditType(doc) {
    setEditingDocId(doc.docId);
    setEditingDocType(doc.docType || "evidence");
  }

  function cancelEditType() {
    setEditingDocId(null);
    setEditingDocType("evidence");
  }

  async function saveEditType() {
    if (!editingDocId) return;
    setBusy(true);
    try {
      await DocumentRepository.updateMetadata(editingDocId, { docType: editingDocType });
      await refreshDocs(caseId);
      flashStatus("Type updated.");
      cancelEditType();
    } catch (err) {
      alert(err?.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOcrImage() {
    setOcrMsg("OCR not enabled yet (next milestone).");
    setOcrProgress(0);
    window.setTimeout(() => setOcrMsg(""), 2200);
  }

  const title = c?.title?.trim() ? c.title : "Documents";

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <PageTitle>{title}</PageTitle>

        <TextBlock>
          Upload evidence and court documents for this case. Files are stored in your browser
          (IndexedDB). If you switch devices/browsers, uploads won't follow automatically.
        </TextBlock>

        <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <SecondaryButton href={`${ROUTES.dashboard}`}>Back to Dashboard</SecondaryButton>

          <SecondaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(caseId)}`}>
            Preview Packet
          </SecondaryButton>

          <SecondaryButton href={`${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`}>
            Edit Intake
          </SecondaryButton>
        </div>

        {statusMsg ? (
          <div
            style={{
              marginTop: "12px",
              padding: "12px 14px",
              borderRadius: "14px",
              background: "#ecf8ee",
              border: "1px solid #bfe7c7",
              fontSize: "14px"
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: statusFiles.length ? 8 : 0 }}>{statusMsg}</div>
            {statusFiles.length ? (
              <div style={{ fontSize: "13px", color: "#155724" }}>
                Saved:
                <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                  {statusFiles.slice(0, 6).map((n) => (
                    <div key={n} style={{ fontWeight: 900 }}>
                      {n}
                    </div>
                  ))}
                  {statusFiles.length > 6 ? <div style={{ opacity: 0.8 }}>…and {statusFiles.length - 6} more</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Upload */}
        <div style={{ border: "1px solid #e6e6e6", borderRadius: "14px", padding: "14px", background: "#fff", marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Upload</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontSize: 13 }}>
              Document type:
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{ marginLeft: 8, padding: 8, borderRadius: 10, border: "1px solid #ddd" }}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <input type="file" multiple onChange={handleUpload} disabled={busy} style={{ fontSize: 13 }} />
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
            Tip: pick the best type before uploading — you can still change it after upload.
          </div>

          {parseMsg ? <div style={{ marginTop: 10, fontSize: 13, color: "#333" }}>{parseMsg}</div> : null}
          {ocrMsg ? <div style={{ marginTop: 10, fontSize: 13, color: "#333" }}>{ocrMsg}</div> : null}
          {ocrProgress ? <div style={{ marginTop: 10, fontSize: 13, color: "#333" }}>OCR progress: {ocrProgress}%</div> : null}
        </div>

        {/* Uploaded Files */}
        <div style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 14, background: "#fff", marginTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Uploaded Files</div>

          {docs.length === 0 ? (
            <div style={{ fontSize: 13, color: "#666" }}>No files yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {docs.map((d, idx) => {
                const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[idx] || `(${idx + 1})`;
                const exhibitLabel = `Exhibit ${letter}`;
                const savedTime = descSavedAt[d.docId];
                const topDisabled = idx === 0;
                const bottomDisabled = idx === docs.length - 1;
                const typeLabel = d.docTypeLabel || getDocTypeLabel(d.docType);

                return (
                  <div
                    key={d.docId}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: "12px 14px",
                      background: "#fafafa"
                    }}
                  >
                    <div style={{ fontWeight: 1000, fontSize: 16, lineHeight: 1.25 }}>{exhibitLabel}</div>
                    <div style={{ marginTop: 4, fontWeight: 1000, fontSize: 16 }}>{d.name}</div>

                    <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                      {d.mimeType || "file"} • {formatBytes(d.size)} • uploaded{" "}
                      {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : "(unknown)"}
                    </div>

                    <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                      Type: <strong>{typeLabel}</strong>
                    </div>

                    <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                      Extracted text: <strong>{d.extractedText && d.extractedText.trim() ? "Yes" : "No"}</strong>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900, fontSize: 12 }}>Short description (for packet)</div>

                        {savedTime ? (
                          <div style={{ fontSize: 12, fontWeight: 900, color: "#155724", marginLeft: 6 }}>Saved {savedTime}</div>
                        ) : null}

                        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
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
                              fontSize: 13
                            }}
                          >
                            Open
                          </a>

                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              const t = prompt("Enter a short description for this exhibit (will appear in the packet):", d.exhibitDescription || "");
                              if (t !== null) saveDocDescription(d.docId, t);
                            }}
                            style={{
                              textDecoration: "none",
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #ddd",
                              background: "white",
                              fontWeight: 800,
                              color: "#111",
                              fontSize: 13
                            }}
                          >
                            Edit description
                          </a>

                          {/* Inline type editor */}
                          {editingDocId === d.docId ? (
                            <>
                              <select
                                value={editingDocType}
                                onChange={(e) => setEditingDocType(e.target.value)}
                                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }}
                                disabled={busy}
                              >
                                {DOC_TYPES.map((t) => (
                                  <option key={t.key} value={t.key}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>

                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  saveEditType();
                                }}
                                style={{
                                  textDecoration: "none",
                                  padding: "8px 10px",
                                  borderRadius: 10,
                                  border: "1px solid #111",
                                  background: "#111",
                                  color: "#fff",
                                  fontWeight: 800,
                                  fontSize: 13
                                }}
                              >
                                Save
                              </a>

                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  cancelEditType();
                                }}
                                style={{
                                  textDecoration: "none",
                                  padding: "8px 10px",
                                  borderRadius: 10,
                                  border: "1px solid #ddd",
                                  background: "white",
                                  fontWeight: 800,
                                  color: "#111",
                                  fontSize: 13
                                }}
                              >
                                Cancel
                              </a>
                            </>
                          ) : (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                openEditType(d);
                              }}
                              style={{
                                textDecoration: "none",
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                fontWeight: 800,
                                color: "#111",
                                fontSize: 13
                              }}
                            >
                              Change type
                            </a>
                          )}

                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (!topDisabled) handleMove(d.docId, -1);
                            }}
                            aria-disabled={topDisabled}
                            style={{
                              textDecoration: "none",
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #ddd",
                              background: "white",
                              fontWeight: 800,
                              color: topDisabled ? "#999" : "#111",
                              fontSize: 13,
                              pointerEvents: topDisabled ? "none" : "auto",
                              opacity: topDisabled ? 0.5 : 1
                            }}
                          >
                            ▲ Move up
                          </a>

                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (!bottomDisabled) handleMove(d.docId, +1);
                            }}
                            aria-disabled={bottomDisabled}
                            style={{
                              textDecoration: "none",
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #ddd",
                              background: "white",
                              fontWeight: 800,
                              color: bottomDisabled ? "#999" : "#111",
                              fontSize: 13,
                              pointerEvents: bottomDisabled ? "none" : "auto",
                              opacity: bottomDisabled ? 0.5 : 1
                            }}
                          >
                            ▼ Move down
                          </a>

                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              const ok = window.confirm("Are you sure you want to delete this document?");
                              if (ok) handleDelete(d.docId);
                            }}
                            style={{
                              textDecoration: "none",
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #ddd",
                              background: "#fff",
                              fontWeight: 800,
                              color: "#b00020",
                              fontSize: 13
                            }}
                          >
                            Delete
                          </a>
                        </div>
                      </div>
                    </div>
                );
              })}
            </div>
          )}
        </div>
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
