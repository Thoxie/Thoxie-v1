// Path: /app/_components/CasePacket.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { DocumentRepository } from "../_repository/documentRepository";
import { ROUTES } from "../_config/routes";

export default function CasePacket({ c }) {
  const county = c?.jurisdiction?.county || "(not set)";
  const courtName = c?.jurisdiction?.courtName || "(not set)";
  const courtAddress = c?.jurisdiction?.courtAddress || "(not set)";
  const clerkUrl = c?.jurisdiction?.clerkUrl || "";
  const courtNotes = c?.jurisdiction?.notes || "";

  const roleLabel = c?.role === "defendant" ? "Defendant" : "Plaintiff";

  const caseNumber = c?.caseNumber?.trim() ? c.caseNumber.trim() : "";
  const status = c?.status || "draft";
  const filedDate = c?.filedDate?.trim() ? c.filedDate.trim() : "";
  const hearingDate = c?.hearingDate?.trim() ? c.hearingDate.trim() : "";
  const hearingTime = c?.hearingTime?.trim() ? c.hearingTime.trim() : "";

  const [docs, setDocs] = useState([]);
  const [docsError, setDocsError] = useState("");

  const caseId = c?.id || "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDocsError("");
      if (!caseId) {
        setDocs([]);
        return;
      }
      try {
        const rows = await DocumentRepository.listByCaseId(caseId);
        if (!cancelled) setDocs(rows || []);
      } catch (err) {
        if (!cancelled) {
          setDocs([]);
          setDocsError(err?.message || "Could not load uploaded documents.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const exhibitRows = useMemo(() => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return (docs || []).map((d, idx) => {
      const letter = alphabet[idx] || `(${idx + 1})`;
      const desc = (d.exhibitDescription || "").trim();
      return {
        label: `Exhibit ${letter}`,
        description: desc,
        docId: d.docId,
        name: d.name,
        uploadedAt: d.uploadedAt,
        size: d.size,
        mimeType: d.mimeType,
        docTypeLabel: d.docTypeLabel || formatDocTypeString(d.docType)
      };
    });
  }, [docs]);

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

  return (
    <div style={box}>
      <div style={title}>California Small Claims — Draft Packet</div>

      <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
        <a
          href={`${ROUTES.preview}?caseId=${caseId}`}
          style={{
            display: "inline-block",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #111",
            textDecoration: "none",
            color: "#111",
            fontWeight: 800,
            background: "transparent"
          }}
        >
          Open Preview Packet
        </a>
        <a
          href={`${ROUTES.preview}?caseId=${caseId}`}
          onClick={(e) => {
            // preview opens; printing handled on preview page
          }}
          style={{
            display: "inline-block",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #111",
            textDecoration: "none",
            color: "#111",
            fontWeight: 800,
            background: "transparent"
          }}
        >
          Preview Packet
        </a>
      </div>

      <Row label="Filing Status" value={status} />
      <Row label="Case Number" value={caseNumber || "(not set)"} />
      <Row label="Filed Date" value={filedDate || "(not set)"} />
      <Row
        label="Hearing"
        value={hearingDate && hearingTime ? `${hearingDate} at ${hearingTime}` : hearingDate || hearingTime || "(not set)"}
      />

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "14px 0" }} />

      <Row label="Role" value={roleLabel} />
      <Row label="Category" value={c?.category || "(not set)"} />
      <Row label="County" value={county} />
      <Row label="Court" value={courtName} />
      <Row label="Court Address" value={courtAddress} />
      <Row label="Damages" value={formatMoney(c?.damages)} />

      {(clerkUrl || courtNotes) && (
        <>
          <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "14px 0" }} />
          <div style={sectionTitle}>Court Links & Notes</div>

          {clerkUrl && (
            <div style={paragraph}>
              Clerk / Court site:{" "}
              <a href={clerkUrl} target="_blank" rel="noreferrer">
                {clerkUrl}
              </a>
            </div>
          )}

          {courtNotes && (
            <div style={paragraph}>
              <strong>Note:</strong> {courtNotes}
            </div>
          )}
        </>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "14px 0" }} />

      <div style={sectionTitle}>Parties</div>
      <div style={paragraph}>
        Plaintiff: <strong>{c?.parties?.plaintiff || "(not set)"}</strong>
        <br />
        Defendant: <strong>{c?.parties?.defendant || "(not set)"}</strong>
      </div>

      <div style={sectionTitle}>Facts</div>
      {Array.isArray(c?.factsItems) && c.factsItems.length > 0 ? (
        <ul style={{ marginTop: "6px", paddingLeft: "18px", lineHeight: 1.7, color: "#222" }}>
          {c.factsItems.map((f) => (
            <li key={f.id} style={{ marginTop: "6px" }}>{f.text}</li>
          ))}
        </ul>
      ) : (
        <div style={paragraph}>{c?.facts?.trim() ? c.facts : "Placeholder… (no facts entered yet)"}</div>
      )}

      <div style={sectionTitle}>Exhibits (from uploaded Documents)</div>

      {docsError ? (
        <div style={{ ...paragraph, color: "#b00020", fontWeight: 800 }}>{docsError}</div>
      ) : exhibitRows.length === 0 ? (
        <div style={paragraph}>None yet. Upload documents under <strong>Dashboard → Documents</strong>.</div>
      ) : (
        <div style={{ marginTop: "8px" }}>
          {exhibitRows.map((ex) => (
            <div key={ex.docId} style={{ border: "1px solid #eee", borderRadius: 12, padding: "10px 12px", background: "#fafafa", marginTop: 10 }}>
              <div style={{ fontWeight: 900 }}>{ex.label}{ex.description ? ` — ${ex.description}` : ""}: {ex.name}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                {ex.docTypeLabel ? <>{ex.docTypeLabel} • </> : null}{ex.mimeType || "file"} • {formatBytes(ex.size)} • uploaded {ex.uploadedAt ? new Date(ex.uploadedAt).toLocaleString() : "(unknown)"}
              </div>
              <div style={{ marginTop: 10 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleOpen(ex.docId); }} style={{ display: "inline-block", padding: "10px 12px", borderRadius: 10, textDecoration: "none", fontWeight: 800, border: "2px solid #111", color: "#111", background: "transparent" }}>Open Exhibit</a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: "#666", lineHeight: 1.5 }}>
        This packet is a draft generated for preparation and organization. It is not legal advice and is not filed with any court.
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={row}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

function formatMoney(n) {
  if (n === null || n === undefined) return "(not set)";
  const num = Number(n);
  if (Number.isNaN(num)) return "(invalid)";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

const box = { border: "1px solid #e6e6e6", borderRadius: 12, padding: 16, background: "#fff", maxWidth: 920 };
const title = { fontWeight: 900, fontSize: 16, marginBottom: 10 };
const row = { display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, padding: "6px 0" };
const labelStyle = { color: "#555", fontWeight: 800, fontSize: 13 };
const valueStyle = { color: "#111", fontWeight: 700 };
const sectionTitle = { marginTop: 14, fontWeight: 900, fontSize: 14 };
const paragraph = { marginTop: 6, lineHeight: 1.7, color: "#222" };
