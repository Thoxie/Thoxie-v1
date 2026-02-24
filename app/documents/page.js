// Path: /app/documents/page.js
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
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

  const [noticeText, setNoticeText] = useState("");
  const [parseMsg, setParseMsg] = useState("");
  const [ocrMsg, setOcrMsg] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);

  // Upload confirmation banner
  const [statusMsg, setStatusMsg] = useState("");
  const [statusFiles, setStatusFiles] = useState([]);

  // description save feedback
  const [descSavingId, setDescSavingId] = useState(""); // docId currently saving
  const [descSavedAt, setDescSavedAt] = useState({}); // docId -> timestamp string

  const [docType, setDocType] = useState("evidence");

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

  const canParse = Boolean(noticeText.trim());

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

  async function handleOcrImage() {
    setOcrMsg("OCR not enabled yet (next milestone).");
    setOcrProgress(0);
    window.setTimeout(() => setOcrMsg(""), 2200);
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
          <div style={{ marginTop: 12, color: "#b00020", fontWeight: 900 }}>{error}</div>
          <div style={{ marginTop: 12 }}>
            <SecondaryButton href={`${ROUTES.dashboard}`}>Back to Dashboard</SecondaryButton>
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

        <TextBlock>
          Upload evidence and court documents for this case. Files are stored in your browser
          (IndexedDB). If you switch devices/browsers, uploads won’t follow automatically.
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
              fontSize: "14px",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: statusFiles.length ? 8 : 0 }}>
              {statusMsg}
            </div>

            {statusFiles.length ? (
              <div style={{ fontSize: "13px", color: "#155724" }}>
                Saved:
                <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                  {statusFiles.slice(0, 6).map((n) => (
                    <div key={n} style={{ fontWeight: 900 }}>
                      {n}
                    </div>
                  ))}
                  {statusFiles.length > 6 ? (
                    <div style={{ opacity: 0.8 }}>…and {statusFiles.length - 6} more</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Upload */}
        <div style={{ ...card, marginTop: "14px" }}>
          <div style={{ fontWeight: 900, marginBottom: "10px" }}>Upload</div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontSize: "13px" }}>
              Document type:
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{
                  marginLeft: "8px",
                  padding: "8px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="evidence">Evidence / Exhibit</option>
                <option value="court_filing">Court filing</option>
                <option value="correspondence">Correspondence</option>
                <option value="photo">Photo / Image</option>
                <option value="other">Other</option>
              </select>
            </label>

            <input
              type="file"
              multiple
              onChange={handleUpload}
              disabled={busy}
              style={{ fontSize: "13px" }}
            />
          </div>

          {parseMsg ? (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#333" }}>{parseMsg}</div>
          ) : null}

          {ocrMsg ? (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#333" }}>{ocrMsg}</div>
          ) : null}

          {ocrProgress ? (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#333" }}>
              OCR progress: {ocrProgress}%
            </div>
          ) : null}
        </div>

        {/* Court Notice Parser */}
        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>
            Paste court notice text (optional)
          </div>

          <TextBlock>
            If you have a court notice PDF that is searchable, open it and copy the text. Paste it
            below and click “Parse & Fill” to auto-fill case number and hearing date/time.
          </TextBlock>

          <textarea
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            placeholder="Paste notice text here…"
            style={{
              width: "100%",
              minHeight: "120px",
              borderRadius: "12px",
              border: "1px solid #ddd",
              padding: "12px",
              fontSize: "13px",
              fontFamily: "system-ui, sans-serif",
            }}
          />

          <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <PrimaryButton
              href="#"
              onClick={(e) => (e.preventDefault(), handleParse())}
              disabled={!canParse}
            >
              Parse & Fill
            </PrimaryButton>

            <SecondaryButton
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setNoticeText("");
                setParseMsg("");
                setOcrMsg("");
              }}
              disabled={busy}
            >
              Clear
            </SecondaryButton>
          </div>
        </div>

        {/* Uploaded Files */}
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
                      Extracted text:{" "}
                      <strong>{d.extractedText && d.extractedText.trim() ? "Yes" : "No"}</strong>
                    </div>

                    <div style={{ marginTop: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                              fontSize: 13,
                            }}
                          >
                            Open
                          </a>

                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              const t = prompt(
                                "Enter a short description for this exhibit (will appear in the packet):",
                                d.exhibitDescription || ""
                              );
                              if (t !== null) {
                                saveDocDescription(d.docId, t);
                              }
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
                              opacity: isSaving ? 0.6 : 1,
                              pointerEvents: isSaving ? "none" : "auto",
                            }}
                          >
                            {isSaving ? "Saving…" : "Edit description"}
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
                              fontSize: 13,
                            }}
                          >
                            Delete
                          </a>
                        </div>
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

function formatDocTypeString(s) {
  const v = String(s || "").toLowerCase();
  if (!v || v === "evidence") return "Evidence / Exhibit";
  if (v === "court_filing") return "Court filing";
  if (v === "pleading") return "Pleading / Court filing";
  if (v === "correspondence") return "Correspondence";
  if (v === "photo") return "Photo / Image";
  if (v === "other") return "Other";
  return v.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function parseCourtNoticeText(text) {
  const t = String(text || "").replace(/\r/g, "\n");

  const out = {
    caseNumber: "",
    hearingDate: "",
    hearingTime: "",
  };

  // Case Number heuristics
  const caseNumMatch =
    t.match(/\bCase\s*(No\.|Number)\s*[:#]?\s*([A-Za-z0-9\-]+)/i) ||
    t.match(/\bNo\.\s*([A-Za-z0-9\-]{6,})\b/i);
  if (caseNumMatch && caseNumMatch[2]) out.caseNumber = String(caseNumMatch[2]).trim();
  else if (caseNumMatch && caseNumMatch[1]) out.caseNumber = String(caseNumMatch[1]).trim();

  // Hearing date/time heuristics
  const dateMatch =
    t.match(/\b(Hearing\s*Date|Date)\s*[:#]?\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})\b/i) ||
    t.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);

  if (dateMatch && dateMatch[2]) out.hearingDate = String(dateMatch[2]).trim();
  else if (dateMatch && dateMatch[1]) out.hearingDate = String(dateMatch[1]).trim();

  const timeMatch =
    t.match(/\b(Time)\s*[:#]?\s*(\d{1,2}:\d{2}\s*(AM|PM))\b/i) ||
    t.match(/\b(\d{1,2}:\d{2}\s*(AM|PM))\b/i);

  if (timeMatch && timeMatch[2]) out.hearingTime = String(timeMatch[2]).trim();
  else if (timeMatch && timeMatch[1]) out.hearingTime = String(timeMatch[1]).trim();

  return out;
}
