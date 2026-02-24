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
import SecondaryButton from "../_components/SecondaryButton";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

/**
 * Minimal, defensive doc type list to avoid depending on any external file.
 */
const DOC_TYPES = [
  { key: "evidence", label: "Evidence / Exhibit" },
  { key: "court_filing", label: "Court filing" },
  { key: "pleading", label: "Pleading / Court filing" },
  { key: "correspondence", label: "Correspondence" },
  { key: "photo", label: "Photo / Image" },
  { key: "other", label: "Other" }
];

function docTypeLabel(key) {
  try {
    const k = String(key || "").trim().toLowerCase();
    if (!k) return "Evidence / Exhibit";
    const found = DOC_TYPES.find((t) => t.key === k);
    if (found) return found.label;
    return k.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  } catch {
    return "Evidence / Exhibit";
  }
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

  const [c, setC] = useState(null);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusFiles, setStatusFiles] = useState([]);

  // description save status
  const [descSavingId, setDescSavingId] = useState("");
  const [descSavedAt, setDescSavedAt] = useState({});

  // inline type editor
  const [editingDocId, setEditingDocId] = useState(null);
  const [editingDocType, setEditingDocType] = useState("evidence");

  // upload default type
  const [uploadDocType, setUploadDocType] = useState("evidence");

  // load case and docs
  useEffect(() => {
    if (!caseId) return;
    const found = CaseRepository.getById(caseId);
    if (!found) {
      setC(null);
      setDocs([]);
      return;
    }
    setC(found);
    refreshDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function refreshDocs() {
    if (!caseId) {
      setDocs([]);
      return;
    }
    try {
      const rows = await DocumentRepository.listByCaseId(caseId);
      setDocs(Array.isArray(rows) ? rows : []);

      // Backfill missing labels if any (safe local write)
      const missing = (rows || []).filter((r) => !r.docTypeLabel);
      if (missing.length > 0) {
        for (const r of missing) {
          await DocumentRepository.updateMetadata(r.docId, { docType: r.docType || "evidence" });
        }
        const after = await DocumentRepository.listByCaseId(caseId);
        setDocs(Array.isArray(after) ? after : []);
      }
    } catch {
      setDocs([]);
    }
  }

  function flashStatus(msg, files = []) {
    setStatusMsg(msg);
    setStatusFiles(files);
    setTimeout(() => {
      setStatusMsg("");
      setStatusFiles([]);
    }, 6000);
  }

  function markDescSaved(docId) {
    try {
      const t = new Date();
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      setDescSavedAt((prev) => ({ ...prev, [docId]: `${hh}:${mm}` }));
      setTimeout(() => {
        setDescSavedAt((prev) => {
          const next = { ...prev };
          delete next[docId];
          return next;
        });
      }, 6000);
    } catch {}
  }

  async function handleUpload(e) {
    const files = e?.target?.files;
    if (!files || files.length === 0 || !caseId) return;
    setBusy(true);
    const names = Array.from(files).map((f) => f?.name).filter(Boolean);
    try {
      await DocumentRepository.addFiles(caseId, files, { docType: uploadDocType });
      await refreshDocs();
      flashStatus("Upload successful", names);
    } catch (err) {
      alert(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (e?.target) e.target.value = "";
    }
  }

  async function handleOpen(docId) {
    const url = await DocumentRepository.getObjectUrl(docId);
    if (!url) {
      alert("File not available");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function saveDocDescription(docId, text) {
    if (!docId) return;
    setDescSavingId(docId);
    try {
      await DocumentRepository.updateMetadata(docId, { exhibitDescription: text });
      markDescSaved(docId);
      flashStatus("Description saved");
      await refreshDocs();
    } catch (err) {
      alert(err?.message || "Save failed");
    } finally {
      setDescSavingId("");
    }
  }

  function openEditType(d) {
    setEditingDocId(d.docId);
    setEditingDocType(d.docType || "evidence");
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
      await refreshDocs();
      flashStatus("Type updated");
      cancelEditType();
    } catch (err) {
      alert(err?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(docId) {
    const ok = window.confirm("Delete this uploaded document from this browser?");
    if (!ok) return;
    setBusy(true);
    try {
      await DocumentRepository.delete(docId);
      await refreshDocs();
      flashStatus("Deleted");
    } catch (err) {
      alert(err?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(docId, delta) {
    setBusy(true);
    try {
      if (delta < 0) await DocumentRepository.moveUp(docId);
      else await DocumentRepository.moveDown(docId);
      await refreshDocs();
      flashStatus("Reordered");
    } catch (err) {
      alert(err?.message || "Reorder failed");
    } finally {
      setBusy(false);
    }
  }

  // small helper to format bytes
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

  const title = (c && c.title && c.title.trim()) ? c.title : "Documents";

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Container style={{ flex: 1 }}>
        <PageTitle>{title}</PageTitle>

        <TextBlock>Upload evidence and court documents. Files are stored in your browser (IndexedDB).</TextBlock>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <SecondaryButton href={`${ROUTES.dashboard}`}>Back to Dashboard</SecondaryButton>
          <SecondaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(caseId)}`}>Preview Packet</SecondaryButton>
          <SecondaryButton href={`${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`}>Edit Intake</SecondaryButton>
        </div>

        {statusMsg ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#eef7ed", border: "1px solid #bfe7c7" }}>
            <div style={{ fontWeight: 800 }}>{statusMsg}</div>
            {statusFiles.length ? (
              <div style={{ marginTop: 8 }}>
                {statusFiles.slice(0, 6).map((n) => <div key={n} style={{ fontWeight: 700 }}>{n}</div>)}
                {statusFiles.length > 6 ? <div style={{ opacity: 0.8 }}>…and {statusFiles.length - 6} more</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 14, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Upload</div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label>
              Document type:
              <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)} style={{ marginLeft: 8 }}>
                {DOC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>

            <input type="file" multiple onChange={handleUpload} disabled={busy} />
          </div>
        </div>

        <div style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 14, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Uploaded Files</div>

          {docs.length === 0 ? (
            <div style={{ color: "#666" }}>No files yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {docs.map((d, idx) => {
                const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[idx] || `(${idx + 1})`;
                const exhibitLabel = `Exhibit ${letter}`;
                const topDisabled = idx === 0;
                const bottomDisabled = idx === docs.length - 1;
                const typeLabel = d.docTypeLabel || docTypeLabel(d.docType);

                return (
                  <div key={d.docId} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa" }}>
                    <div style={{ fontWeight: 900 }}>{exhibitLabel} — {d.name}</div>
                    <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
                      {typeLabel ? <>{typeLabel} • </> : null}{d.mimeType || "file"} • {formatBytes(d.size)}
                    </div>

                    <div style={{ marginTop: 8, color: "#333" }}>
                      <strong>Description:</strong> {d.exhibitDescription || "(none)"}
                    </div>

                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button onClick={() => handleOpen(d.docId)} style={{ padding: "8px 10px" }}>Open</button>

                      <button onClick={() => {
                        const t = prompt("Short description for packet:", d.exhibitDescription || "");
                        if (t !== null) saveDocDescription(d.docId, t);
                      }} style={{ padding: "8px 10px" }}>Edit description</button>

                      {editingDocId === d.docId ? (
                        <>
                          <select value={editingDocType} onChange={(e) => setEditingDocType(e.target.value)} disabled={busy}>
                            {DOC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                          </select>
                          <button onClick={saveEditType} style={{ padding: "8px 10px" }}>Save</button>
                          <button onClick={cancelEditType} style={{ padding: "8px 10px" }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => openEditType(d)} style={{ padding: "8px 10px" }}>Change type</button>
                      )}

                      <button onClick={() => { if (!topDisabled) handleMove(d.docId, -1); }} disabled={topDisabled} style={{ padding: "8px 10px" }}>▲ Move up</button>
                      <button onClick={() => { if (!bottomDisabled) handleMove(d.docId, +1); }} disabled={bottomDisabled} style={{ padding: "8px 10px" }}>▼ Move down</button>

                      <button onClick={() => {
                        const ok = window.confirm("Delete this uploaded document?");
                        if (ok) handleDelete(d.docId);
                      }} style={{ padding: "8px 10px", color: "#b00020" }}>Delete</button>
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
