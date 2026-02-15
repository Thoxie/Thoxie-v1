// Path: /app/case-dashboard/_components/FormsCard.js
"use client";

import { resolveSmallClaimsForms } from "../../_lib/formRequirementsResolver";

export default function FormsCard({ caseRecord }) {
  const res = resolveSmallClaimsForms(caseRecord || {});
  const required = Array.isArray(res?.required) ? res.required : [];
  const conditional = Array.isArray(res?.conditional) ? res.conditional : [];
  const missing = Array.isArray(res?.missingInfoQuestions) ? res.missingInfoQuestions : [];
  const notes = Array.isArray(res?.notes) ? res.notes : [];

  function renderFormRow(f) {
    const url = (f?.url || "").trim();
    return (
      <div
        key={f.code}
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 10,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>
            {f.code} <span style={{ fontWeight: 700, color: "#444" }}>· {f.stage || "Unknown"}</span>
          </div>
          <div style={{ color: "#666", marginTop: 2, lineHeight: 1.5 }}>
            {f.title || ""}
            {f.reason ? <div style={{ marginTop: 4, color: "#8a5a00" }}>{f.reason}</div> : null}
          </div>
        </div>

        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontWeight: 900,
              textDecoration: "none",
              border: "1px solid #ddd",
              padding: "8px 10px",
              borderRadius: 12,
              background: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            Download PDF
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, background: "#fff" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Forms (CA Small Claims)</div>

      {missing.length ? (
        <div
          style={{
            border: "1px solid #fde68a",
            background: "#fffbeb",
            borderRadius: 12,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Missing info (to finalize forms)</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#6b4f00", lineHeight: 1.6 }}>
            {missing.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {required.length ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Required / Included</div>
          <div style={{ display: "grid", gap: 10 }}>{required.map(renderFormRow)}</div>
        </div>
      ) : (
        <div style={{ color: "#666" }}>No required forms detected.</div>
      )}

      {conditional.length ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Conditional (needs your answers)</div>
          <div style={{ display: "grid", gap: 10 }}>{conditional.map(renderFormRow)}</div>
        </div>
      ) : null}

      {notes.length ? (
        <div style={{ marginTop: 12, color: "#666", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Notes</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {notes.map((n, idx) => (
              <li key={idx}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

