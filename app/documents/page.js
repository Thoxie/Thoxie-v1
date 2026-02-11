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

  // NEW: paste-to-parse (safe today; no PDF/OCR deps)
  const [noticeText, setNoticeText] = useState("");
  const [parseMsg, setParseMsg] = useState("");

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
      setParseMsg(
        "Uploaded. If this was a court notice PDF, open it and copy its text, then paste below to auto-fill Case Number / Hearing Date / Time (beta)."
      );
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

  function applyParsedToCase(parsed) {
    if (!c) return;

    const next = { ...c };

    // Only overwrite if we found a value.
    // If user already manually entered data, we ASK before overwriting.
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

      // Apply confirmed overwrites
      overwrites.forEach(([field, _oldV, newV]) => {
        if (field === "Case Number") next.caseNumber = newV;
        if (field === "Hearing Date") next.hearingDate = newV;
        if (field === "Hearing Time") next.hearingTime = newV;
      });
    }

    const saved = CaseRepository.save(next);
    setC(saved);

    setParseMsg(
      `Updated case fields: ${
        [
          parsed.caseNumber ? "Case Number" : null,
          parsed.hearingDate ? "Hearing Date" : null,
          parsed.hearingTime ? "Hearing Time" : null
        ].filter(Boolean).join(", ") || "(none)"
      }.`
    );
  }

  function handleParseNoticeText() {
    setParseMsg("");
    const txt = (noticeText || "").trim();
    if (!txt) {
      setParseMsg("Paste some text first (from the PDF court notice) and try again.");
      return;
    }

    const parsed = parseCourtNoticeText(txt);

    if (!parsed.caseNumber && !parsed.hearingDate && !parsed.hearingTime) {
      setParseMsg(
        "No Case Number / Hearing Date / Hearing Time detected. If this is a scanned PDF, we’ll need OCR (next milestone)."
      );
      return;
    }

    applyParsedToCase(parsed);
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
          (IndexedDB). This is not cloud storage yet.
        </TextBlock>

        {c && (
          <div style={{ ...card, marginTop: "12px" }}>
            <div style={{ fontWeight: 900 }}>{headerLine}</div>
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#555" }}>
              Case ID: <code>{caseId}</code>
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

          <input
            type="file"
            multiple
            onChange={handleUpload}
            disabled={busy}
            style={{ display: "block", marginTop: "6px" }}
          />

          <div style={{ marginTop: "8px", fontSize: "13px", color: "#666" }}>
            Tip: upload the court notice/summons here, then use the auto-fill tool below.
          </div>
        </div>

        {/* NEW: Auto-fill (beta) */}
        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>
            Auto-fill Case Info from Court Notice (Beta)
          </div>

          <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}>
            Today’s safe version avoids OCR/PDF libraries (to protect Vercel deployments).
            <br />
            <strong>How to use:</strong> Click “Open” on your uploaded PDF → select all text → copy →
            paste into the box → “Parse & Fill”.
          </div>

          <textarea
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            placeholder="Paste text from your court notice PDF here…"
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

            <button
              type="button"
              onClick={() => {
                setNoticeText("");
                setParseMsg("");
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

          {parseMsg ? (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#333" }}>
              {parseMsg}
            </div>
          ) : null}
        </div>

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={{ fontWeight: 900, marginBottom: "8px" }}>Uploaded Files</div>

          {docs.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#666" }}>No files yet.</div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
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
                  <div style={{ fontWeight: 900 }}>{d.name}</div>
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

                    <SecondaryButton
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(d.docId);
                      }}
                    >
                      Delete
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>

      <Footer />
    </main>
  );
}

function parseCourtNoticeText(txt) {
  const cleaned = txt.replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ");

  // Case number patterns (try many)
  const caseNoMatch =
    cleaned.match(/Case\s*(No\.|Number|#)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i) ||
    cleaned.match(/Case\s*No\.\s*([A-Za-z0-9\-]+)/i) ||
    cleaned.match(/\bCase\b\s*:\s*([A-Za-z0-9\-]+)/i);

  const caseNumber = caseNoMatch ? (caseNoMatch[2] || caseNoMatch[1] || "").trim() : "";

  // Hearing date patterns
  const hearingDateMatch =
    cleaned.match(/Hearing\s*Date\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i) ||
    cleaned.match(/Hearing\s*Date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
    cleaned.match(/\bDate\b\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  const hearingDate = hearingDateMatch ? (hearingDateMatch[1] || "").trim() : "";

  // Hearing time patterns
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
