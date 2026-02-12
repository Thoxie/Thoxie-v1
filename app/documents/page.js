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

  // paste/OCR text + messaging
  const [noticeText, setNoticeText] = useState("");
  const [parseMsg, setParseMsg] = useState("");
  const [ocrMsg, setOcrMsg] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);

  // NEW: clear “saved” messaging for user
  const [statusMsg, setStatusMsg] = useState("");

  // NEW confirmable doc type before upload
  const [docType, setDocType] = useState("evidence");

  async function refreshDocs(id) {
    const rows = await DocumentRepository.listByCaseId(id);
    setDocs(rows);
  }

  function flashStatus(msg) {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(""), 2500);
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
    background: "#fff"
  };

  const canParse = Boolean(noticeText.trim());

  async function handleUpload(e) {
    const files = e?.target?.files;
    if (!caseId) return;
    if (!files || files.length === 0) return;

    setBusy(true);
    setParseMsg("");
    setOcrMsg("");
    try {
      await DocumentRepository.addFiles(caseId, files, { docType });
      await refreshDocs(caseId);
      setParseMsg(
        "Uploaded. For searchable PDFs: Open → copy text → paste below → Parse & Fill. For scans: use OCR on an uploaded image (PNG/JPG)."
      );
      flashStatus("Document(s) saved.");
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
    try {
      await DocumentRepository.updateMetadata(docId, { exhibitDescription: text });
      flashStatus("Saved.");
    } catch (err) {
      // non-blocking
    }
  }

  async function handleOcrImage(docId) {
    // OCR intentionally stubbed (next milestone)
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

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <PageTitle>Documents</PageTitle>

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
              marginTop: "10px",
              padding: "10px 12px",
              borderRadius: "12px",
              background: "#f1f6ff",
              border: "1px solid #d7e6ff",
              fontSize: "13px"
            }}
          >
            {statusMsg}
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
                  border: "1px solid #ddd"
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
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#333" }}>
              {parseMsg}
            </div>
          ) : null}

          {ocrMsg ? (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#333" }}>
              {ocrMsg}
            </div>
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
              fontFamily: "system-ui, sans-serif"
            }}
          />

          <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <PrimaryButton href="#" onClick={(e) => (e.preventDefault(), handleParse())} disabled={!canParse}>
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
                const isImage = (d.mimeType || "").toLowerCase().startsWith("image/");
                const isPdf = (d.mimeType || "").toLowerCase() === "application/pdf";
                const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[idx] || `(${idx + 1})`;
                const exhibitLabel = `Exhibit ${letter}`;

                return (
                  <div
                    key={d.docId}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      background: "#fafafa"
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {exhibitLabel} — {d.name}
                    </div>

                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                      {d.mimeType || "file"} • {formatBytes(d.size)} • uploaded{" "}
                      {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : "(unknown)"}
                    </div>

                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                      Type: <strong>{formatDocType(d.docType)}</strong>
                    </div>

                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                      Extracted text:{" "}
                      <strong>{d.extractedText && d.extractedText.trim() ? "Yes" : "No"}</strong>
                    </div>

                    {/* short description */}
                    <div style={{ marginTop: "10px" }}>
                      <div style={{ fontWeight: 900, fontSize: "12px" }}>Short description (for packet)</div>
                      <input
                        type="text"
                        value={d.exhibitDescription || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDocs((prev) =>
                            prev.map((x) => (x.docId === d.docId ? { ...x, exhibitDescription: val } : x))
                          );
                        }}
                        onBlur={() => saveDocDescription(d.docId, d.exhibitDescription || "")}
                        placeholder='e.g., "Text messages (Jan 5–Jan 10)"'
                        style={{
                          marginTop: "6px",
                          width: "100%",
                          maxWidth: "720px",
                          borderRadius: "10px",
                          border: "1px solid #ddd",
                          padding: "10px 12px",
                          fontSize: "13px"
                        }}
                      />
                    </div>

                    {/* actions */}
                    <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <SecondaryButton
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpen(d.docId);
                        }}
                        disabled={busy}
                      >
                        Open
                      </SecondaryButton>

                      <SecondaryButton
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          copyCitationToClipboard(exhibitLabel, d);
                        }}
                        disabled={busy}
                      >
                        Copy Cite
                      </SecondaryButton>

                      {isImage ? (
                        <SecondaryButton
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOcrImage(d.docId);
                          }}
                          disabled={busy}
                        >
                          OCR Image (stub)
                        </SecondaryButton>
                      ) : null}

                      {isPdf ? (
                        <div style={{ fontSize: "12px", color: "#666", alignSelf: "center" }}>
                          PDF OCR not enabled yet (next milestone).
                        </div>
                      ) : null}

                      <SecondaryButton
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(d.docId);
                        }}
                        disabled={busy}
                      >
                        Delete
                      </SecondaryButton>
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

function formatDocType(t) {
  const v = (t || "").toLowerCase();
  if (v === "court_filing") return "Court filing";
  if (v === "correspondence") return "Correspondence";
  if (v === "photo") return "Photo / Image";
  if (v === "other") return "Other";
  return "Evidence / Exhibit";
}

function parseCourtNoticeText(txt) {
  const cleaned = txt.replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ");

  const caseNoMatch =
    cleaned.match(/Case\s*(No\.|Number|#)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i) ||
    cleaned.match(/Case\s*No\.\s*([A-Za-z0-9\-]+)/i) ||
    cleaned.match(/\bCase\b\s*:\s*([A-Za-z0-9\-]+)/i);

  const caseNumber = caseNoMatch ? (caseNoMatch[2] || caseNoMatch[1] || "").trim() : "";

  const hearingDateMatch =
    cleaned.match(/Hearing\s*Date\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i) ||
    cleaned.match(/Hearing\s*Date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
    cleaned.match(/\bDate\b\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  const hearingDate = hearingDateMatch ? (hearingDateMatch[1] || "").trim() : "";

  const hearingTimeMatch =
    cleaned.match(/Hearing\s*Time\s*[:\-]?\s*([0-9]{1,2}:[0-9]{2}\s*(AM|PM)?)\b/i) ||
    cleaned.match(/\bTime\b\s*[:\-]?\s*([0-9]{1,2}:[0-9]{2}\s*(AM|PM)?)\b/i);

  const hearingTime = hearingTimeMatch ? (hearingTimeMatch[1] || "").trim() : "";

  return {
    caseNumber: caseNumber || "",
    hearingDate: hearingDate || "",
    hearingTime: hearingTime || ""
  };
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

function buildCitation(exhibitLabel, d) {
  const name = d?.name ? ` — ${d.name}` : "";
  const desc = d?.exhibitDescription ? ` (${d.exhibitDescription})` : "";
  // Page is unknown at this stage; placeholder for future PDF page mapping/OCR.
  return `${exhibitLabel}${name}${desc} [page ?]`;
}

async function copyCitationToClipboard(exhibitLabel, d) {
  try {
    const txt = buildCitation(exhibitLabel, d);
    await navigator.clipboard.writeText(txt);
    alert(`Copied: ${txt}`);
  } catch {
    // Fallback prompt for browsers that block clipboard in some contexts
    const txt = buildCitation(exhibitLabel, d);
    window.prompt("Copy citation:", txt);
  }
}
