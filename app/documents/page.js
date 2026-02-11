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

    const found = CaseRepository.getById(caseId);
    if (!found) {
      setError("Case not found in this browser. Go back to Dashboard.");
      setC(null);
      return;
    }

    setError("");
    setC(found);
    setNoticeText(found.courtNoticeText || "");
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

    const overwrites = [];

    if (parsed.caseNumber) {
      if (next.caseNumber && next.caseNumber.trim() && next.caseNumber.trim() !== parsed.caseNumber) {
        overwrites.push(["Case Number", next.caseNumber, parsed.caseNumber]);
      } else {
        next.caseNumber = parsed.caseNumber;
      }
    }

    if (parsed.hearingDate) {
      if (next.hearingDate && next.hearingDate.trim() && next.hearingDate.trim() !== parsed.hearingDate) {
        overwrites.push(["Hearing Date", next.hearingDate, parsed.hearingDate]);
      } else {
        next.hearingDate = parsed.hearingDate;
      }
    }

    if (parsed.hearingTime) {
      if (next.hearingTime && next.hearingTime.trim() && next.hearingTime.trim() !== parsed.hearingTime) {
        overwrites.push(["Hearing Time", next.hearingTime, parsed.hearingTime]);
      } else {
        next.hearingTime = parsed.hearingTime;
      }
    }

    if (overwrites.length > 0) {
      const msg =
        "I found values that differ from what you already entered:\n\n" +
        overwrites.map(([field, oldV, newV]) => `${field}: "${oldV}" → "${newV}"`).join("\n") +
        "\n\nOverwrite your existing entries with the parsed values?";
      const ok = window.confirm(msg);
      if (!ok) return;

      overwrites.forEach(([field, _oldV, newV]) => {
        if (field === "Case Number") next.caseNumber = newV;
        if (field === "Hearing Date") next.hearingDate = newV;
        if (field === "Hearing Time") next.hearingTime = newV;
      });
    }

    // Persist: both extracted fields AND the source notice text
    next.courtNoticeText = noticeText || "";
    const saved = CaseRepository.save(next);
    setC(saved);

    setParseMsg(
      `Updated: ${
        [
          parsed.caseNumber ? "Case Number" : null,
          parsed.hearingDate ? "Hearing Date" : null,
          parsed.hearingTime ? "Hearing Time" : null
        ].filter(Boolean).join(", ") || "(none)"
      }. Court notice text saved to the case.`
    );
    flashStatus("Case info saved.");
  }

  function handleParseNoticeText() {
    setParseMsg("");
    setOcrMsg("");

    const txt = (noticeText || "").trim();
    if (!txt) {
      setParseMsg("Paste some text first (from the PDF court notice) and try again.");
      return;
    }

    const parsed = parseCourtNoticeText(txt);

    if (!parsed.caseNumber && !parsed.hearingDate && !parsed.hearingTime) {
      setParseMsg(
        "No Case Number / Hearing Date / Hearing Time detected. If this is a scanned PDF, use OCR on an uploaded image (PNG/JPG) or we’ll add PDF OCR later."
      );
      return;
    }

    applyParsedToCase(parsed);
  }

  async function runOcrOnDoc(docId) {
    if (!docId) return;
    if (!caseId) return;

    setBusy(true);
    setOcrMsg("");
    setParseMsg("");
    setOcrProgress(0);

    try {
      const doc = await DocumentRepository.get(docId);
      if (!doc || !doc.blob) throw new Error("Document blob not found.");

      const mt = (doc.mimeType || "").toLowerCase();

      // Today: OCR images only (safe). PDF OCR comes later (requires pdf rendering).
      if (!mt.startsWith("image/")) {
        setOcrMsg("OCR currently runs on images (PNG/JPG). For scanned PDFs, export a page as an image and upload it.");
        return;
      }

      const Tesseract = await import("tesseract.js");

      setOcrMsg("Running OCR…");
      const result = await Tesseract.recognize(doc.blob, "eng", {
        logger: (m) => {
          if (m && m.status === "recognizing text" && typeof m.progress === "number") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const text = (result?.data?.text || "").trim();
      if (!text) {
        setOcrMsg("OCR finished, but no text was detected. Try a clearer image or a higher-resolution export.");
        return;
      }

      // Populate textarea + save source text + parse into fields
      setNoticeText(text);
      saveCourtNoticeTextToCase(text);
      setOcrMsg("OCR complete. Text saved to the case. Parsing now…");
      flashStatus("OCR text saved.");

      const parsed = parseCourtNoticeText(text);
      if (!parsed.caseNumber && !parsed.hearingDate && !parsed.hearingTime) {
        setParseMsg("OCR produced text, but field detection did not match patterns. You can still edit the text and run Parse & Fill.");
      } else {
        applyParsedToCase(parsed);
      }
    } catch (err) {
      setOcrMsg(err?.message || "OCR failed.");
    } finally {
      setBusy(false);
      setOcrProgress(0);
    }
  }

  // NEW: exhibit description save (persist per doc)
  async function saveDocDescription(docId, description) {
    if (!docId) return;
    setBusy(true);
    try {
      await DocumentRepository.updateMetadata(docId, { exhibitDescription: description || "" });
      await refreshDocs(caseId);
      flashStatus("Description saved.");
    } catch (err) {
      alert(err?.message || "Could not save description.");
    } finally {
      setBusy(false);
    }
  }

  // NEW: reorder
  async function moveUp(docId) {
    setBusy(true);
    try {
      await DocumentRepository.moveUp(caseId, docId);
      await refreshDocs(caseId);
      flashStatus("Reordered.");
    } catch (err) {
      alert(err?.message || "Could not reorder.");
    } finally {
      setBusy(false);
    }
  }

  async function moveDown(docId) {
    setBusy(true);
    try {
      await DocumentRepository.moveDown(caseId, docId);
      await refreshDocs(caseId);
      flashStatus("Reordered.");
    } catch (err) {
      alert(err?.message || "Could not reorder.");
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

  if (error) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header />
        <Container style={{ flex: 1 }}>
          <PageTitle>Documents</PageTitle>
          <TextBlock>{error}</TextBlock>
          <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
        </Container>
        <Footer />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Documents</PageTitle>

        <TextBlock>
          Upload evidence (PDFs, images, messages, receipts). Files are stored locally in your browser
          (IndexedDB). Case metadata is stored in localStorage.
        </TextBlock>

        {statusMsg ? (
          <div
            style={{
              marginTop: "10px",
              marginBottom: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "#e8f5e9",
              border: "1px solid #c8e6c9",
              fontWeight: 800,
              maxWidth: "920px"
            }}
          >
            {statusMsg}
          </div>
        ) : null}

        {c && (
          <div style={{ ...card, marginTop: "12px" }}>
            <div style={{ fontWeight: 900 }}>{headerLine}</div>
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#555" }}>
              Case ID: <code>{caseId}</code>
            </div>

            <div style={{ marginTop: "8px", fontSize: "13px", color: "#555" }}>
              Case #: <strong>{c.caseNumber?.trim() ? c.caseNumber.trim() : "(not set)"}</strong>{" "}
              • Hearing:{" "}
              <strong>
                {c.hearingDate?.trim()
                  ? `${c.hearingDate}${c.hearingTime?.trim() ? ` at ${c.hearingTime}` : ""}`
                  : "(not set)"}
              </strong>
            </div>

            <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <SecondaryButton href={`${ROUTES.preview}?caseId=${encodeURIComponent(caseId)}`}>
                Preview Packet
              </SecondaryButton>
              <SecondaryButton href={`${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`}>
                Edit Intake
              </SecondaryButton>
              <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
            </div>
          </div>
        )}

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>Upload</div>

          <div style={{ marginTop: "6px", fontWeight: 900, fontSize: "13px" }}>Upload type</div>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            disabled={busy}
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "#fff",
              marginTop: "8px",
              fontSize: "14px"
            }}
          >
            <option value="evidence">Evidence / Exhibit</option>
            <option value="court_filing">Court filing</option>
            <option value="correspondence">Correspondence</option>
            <option value="photo">Photo / Image</option>
            <option value="other">Other</option>
          </select>

          <input
            type="file"
            multiple
            onChange={handleUpload}
            disabled={busy}
            style={{ display: "block", marginTop: "10px" }}
          />

          <div style={{ marginTop: "8px", fontSize: "13px", color: "#666" }}>
            Searchable PDFs: Open → copy text → paste below → Parse & Fill.
            <br />
            Scanned documents: upload an image (PNG/JPG) and run OCR on that image.
          </div>
        </div>

        {/* Auto-fill */}
        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>
            Auto-fill Case Info (Paste or OCR Text)
          </div>

          <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}>
            This saves the source text into the case so you can return to it later.
          </div>

          <textarea
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            placeholder="Paste text from your court notice here, or run OCR on an uploaded image…"
            style={{
              width: "100%",
              maxWidth: "920px",
              minHeight: "140px",
              marginTop: "10px",
              borderRadius: "12px",
              border: "1px solid #ddd",
              padding: "10px 12px",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "12px"
            }}
          />

          <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <PrimaryButton onClick={handleParseNoticeText} disabled={busy}>
              Parse & Fill
            </PrimaryButton>

            <SecondaryButton
              href="#"
              onClick={(e) => {
                e.preventDefault();
                saveCourtNoticeTextToCase(noticeText || "");
                setParseMsg("Court notice text saved to the case.");
                flashStatus("Text saved.");
              }}
              disabled={busy}
            >
              Save Text Only
            </SecondaryButton>

            <button
              type="button"
              onClick={() => {
                setNoticeText("");
                setParseMsg("");
                setOcrMsg("");
              }}
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: "12px",
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 800
              }}
            >
              Clear
            </button>
          </div>

          {parseMsg ? <div style={{ marginTop: "10px", fontSize: "13px", color: "#333" }}>{parseMsg}</div> : null}
          {ocrMsg ? <div style={{ marginTop: "10px", fontSize: "13px", color: "#333" }}>{ocrMsg}</div> : null}
          {busy && ocrProgress > 0 ? (
            <div style={{ marginTop: "6px", fontSize: "12px", color: "#666" }}>
              OCR progress: {ocrProgress}%
            </div>
          ) : null}
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
                        disabled={busy}
                      />
                      <div style={{ marginTop: "6px", fontSize: "12px", color: "#666" }}>
                        Saves automatically when you click out of the field.
                      </div>
                    </div>

                    {/* reorder controls */}
                    <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <SecondaryButton
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          moveUp(d.docId);
                        }}
                        disabled={busy || idx === 0}
                      >
                        Move Up
                      </SecondaryButton>

                      <SecondaryButton
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          moveDown(d.docId);
                        }}
                        disabled={busy || idx === docs.length - 1}
                      >
                        Move Down
                      </SecondaryButton>
                    </div>

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

                      {isImage ? (
                        <SecondaryButton
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            runOcrOnDoc(d.docId);
                          }}
                          disabled={busy}
                        >
                          Run OCR (Image)
                        </SecondaryButton>
                      ) : isPdf ? (
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
