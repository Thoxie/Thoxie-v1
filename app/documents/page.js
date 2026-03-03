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

  const [noticeText, setNoticeText] = useState("");
  const [parseMsg, setParseMsg] = useState("");
  const [ocrMsg, setOcrMsg] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);

  const [statusMsg, setStatusMsg] = useState("");
  const [statusFiles, setStatusFiles] = useState([]);

  const [descSavingId, setDescSavingId] = useState("");
  const [descSavedAt, setDescSavedAt] = useState({});

  const [docType, setDocType] = useState("evidence");

  const evidenceSummary = useMemo(() => {
    let uncategorized = 0;
    for (const d of docs) {
      const cat = String(d?.evidenceCategory || "").trim();
      if (!cat) uncategorized += 1;
    }
    return { total: docs.length, uncategorized };
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
    try {
      await DocumentRepository.addFiles(caseId, files, { docType });
      await refreshDocs(caseId);

      setParseMsg(
        "Uploaded. Add evidence tags below (Category + What it supports) so your dashboard can show a case-ready evidence map."
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
      if (!url) return alert("Unable to open file.");
      window.open(url, "_blank");
    } catch (e) {
      alert(e?.message || "Unable to open file.");
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

        <TextBlock>
          Upload evidence and court documents for this case. Files are stored in your browser
          (IndexedDB). If you switch devices/browsers, uploads won’t follow automatically.
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
              <input type="file" multiple onChange={handleUpload} disabled={busy} style={{ display: "none" }} />
            </label>

            {/* FIXED: this must use ROUTES.dashboard (which is /case-dashboard) */}
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
              OCR Image (later)
            </button>
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

                    <div style={{ marginTop: "10px", display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
                        >
                          <option value="">Uncategorized</option>
                          {EVIDENCE_CATEGORIES.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
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

                      <details style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
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
                              <label key={t.key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleEvidenceSupport(d.docId, t.key)}
                                  style={{ marginTop: 3 }}
                                />
                                <span style={{ fontSize: 13 }}>{t.label}</span>
                              </label>
                            );
                          })}
                        </div>

                        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                          Tip: keep these tags factual. They drive your dashboard’s evidence map and readiness prompts.
                        </div>
                      </details>

                      <div style={{ fontSize: 12, color: "#555" }}>
                        Evidence summary: <strong>{getEvidenceCategoryLabel(d?.evidenceCategory)}</strong>
                        {Array.isArray(d?.evidenceSupports) && d.evidenceSupports.length ? (
                          <>
                            {" "}• Supports:{" "}
                            <span style={{ fontWeight: 700 }}>
                              {d.evidenceSupports.map(getEvidenceSupportLabel).join(", ")}
                            </span>
                          </>
                        ) : (
                          <>
                            {" "}• Supports:{" "}
                            <span style={{ fontWeight: 700, color: "#8a0000" }}>None tagged yet</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900, fontSize: "12px" }}>
                          Short description (for packet)
                        </div>

                        {savedTime ? (
                          <div style={{ fontSize: "12px", fontWeight: 900, color: "#155724", marginLeft: 6 }}>
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
                        </div>
                      </div>

                      {d.exhibitDescription ? (
                        <div style={{ marginTop: 10, fontSize: 13 }}>
                          <div style={{ fontWeight: 900, fontSize: 12, color: "#666" }}>
                            Current description:
                          </div>
                          <div style={{ marginTop: 6 }}>{d.exhibitDescription}</div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
                          No description yet.
                        </div>
                      )}
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

function formatBytes(bytes = 0) {
  try {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  } catch {
    return String(bytes || "");
  }
}

function formatDocTypeString(s) {
  try {
    return String(s || "evidence")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  } catch {
    return "Evidence";
  }
}
