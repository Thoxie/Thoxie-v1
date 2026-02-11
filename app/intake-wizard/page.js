// Path: /app/intake-wizard/page.js
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";
import SecondaryButton from "../_components/SecondaryButton";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";

export default function IntakeWizardPage() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [c, setC] = useState(null);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("draft");
  const [role, setRole] = useState("plaintiff");
  const [category, setCategory] = useState("");

  const [plaintiff, setPlaintiff] = useState("");
  const [defendant, setDefendant] = useState("");
  const [damages, setDamages] = useState("");

  // Narrative (optional / legacy)
  const [facts, setFacts] = useState("");
  // NEW: structured facts
  const [factsItems, setFactsItems] = useState([]);
  const [newFactText, setNewFactText] = useState("");

  const [caseNumber, setCaseNumber] = useState("");
  const [filedDate, setFiledDate] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [hearingTime, setHearingTime] = useState("");

  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!caseId) {
      setError("Missing caseId. Go to Dashboard → click “Edit Intake.”");
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

    setStatus(found.status || "draft");
    setRole(found.role || "plaintiff");
    setCategory(found.category || "");

    setPlaintiff(found.parties?.plaintiff || "");
    setDefendant(found.parties?.defendant || "");
    setDamages(found.damages ?? "");

    setFacts(found.facts || "");
    setFactsItems(Array.isArray(found.factsItems) ? found.factsItems : []);

    setCaseNumber(found.caseNumber || "");
    setFiledDate(found.filedDate || "");
    setHearingDate(found.hearingDate || "");
    setHearingTime(found.hearingTime || "");
  }, [caseId]);

  const headerLine = useMemo(() => {
    if (!c) return "";
    const county = c.jurisdiction?.county || "Unknown County";
    const roleLabel = role === "defendant" ? "Defendant" : "Plaintiff";
    const cat = category || "Uncategorized";
    return `${county} County — ${roleLabel} — ${cat}`;
  }, [c, role, category]);

  function showSaved(msg = "Saved.") {
    setSavedMsg(msg);
    window.setTimeout(() => setSavedMsg(""), 2500);
  }

  function addFact() {
    const t = (newFactText || "").trim();
    if (!t) return;

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setFactsItems((prev) => [...(Array.isArray(prev) ? prev : []), { id, text: t }]);
    setNewFactText("");
    showSaved("Fact saved.");
  }

  function updateFact(id, patch) {
    if (!id) return;
    setFactsItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }

  function deleteFact(id) {
    if (!id) return;
    setFactsItems((prev) => (Array.isArray(prev) ? prev : []).filter((f) => f.id !== id));
    showSaved("Fact deleted.");
  }

  function buildUpdatedCase() {
    if (!c) return null;

    const next = {
      ...c,
      updatedAt: new Date().toISOString(),
      status,
      role,
      category,
      parties: {
        ...(c.parties || {}),
        plaintiff,
        defendant
      },
      damages: damages === "" ? "" : damages,
      facts,
      factsItems,
      caseNumber,
      filedDate,
      hearingDate,
      hearingTime
    };

    return next;
  }

  function saveCaseOnly() {
    const next = buildUpdatedCase();
    if (!next) return;
    const saved = CaseRepository.save(next);
    setC(saved);
    showSaved("Saved.");
  }

  function saveAndGo(url) {
    saveCaseOnly();
    window.location.href = url;
  }

  if (error) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header />
        <Container style={{ flex: 1 }}>
          <PageTitle>Edit Intake</PageTitle>
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
        <PageTitle>Edit Intake</PageTitle>

        {c && (
          <div style={{ ...card, marginTop: "12px" }}>
            <div style={{ fontWeight: 900 }}>{headerLine}</div>
            <div style={{ marginTop: "6px", fontSize: "13px", color: "#555" }}>
              Case ID: <code>{caseId}</code>
            </div>

            <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <SecondaryButton
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  saveCaseOnly();
                }}
              >
                Save
              </SecondaryButton>

              <SecondaryButton
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  saveAndGo(`${ROUTES.preview}?caseId=${encodeURIComponent(caseId)}`);
                }}
              >
                Save & Preview Packet
              </SecondaryButton>

              <SecondaryButton href={ROUTES.dashboard}>Back to Dashboard</SecondaryButton>
            </div>

            {savedMsg ? (
              <div style={{ marginTop: "10px", fontSize: "13px", fontWeight: 900, color: "#1b5e20" }}>
                {savedMsg}
              </div>
            ) : null}
          </div>
        )}

        <div style={{ ...card, marginTop: "12px" }}>
          <div style={labelStyle}>Status</div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={fieldStyle}>
            <option value="draft">draft</option>
            <option value="ready">ready</option>
            <option value="filed">filed</option>
          </select>

          <div style={{ marginTop: "14px" }}>
            <div style={labelStyle}>Role</div>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={fieldStyle}>
              <option value="plaintiff">Plaintiff</option>
              <option value="defendant">Defendant</option>
            </select>
          </div>

          <div style={{ marginTop: "14px" }}>
            <div style={labelStyle}>Category</div>
            <input value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle} />
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "16px 0" }} />

          <div style={labelStyle}>Plaintiff</div>
          <input value={plaintiff} onChange={(e) => setPlaintiff(e.target.value)} style={fieldStyle} />

          <div style={{ marginTop: "14px" }}>
            <div style={labelStyle}>Defendant</div>
            <input value={defendant} onChange={(e) => setDefendant(e.target.value)} style={fieldStyle} />
          </div>

          <div style={{ marginTop: "14px" }}>
            <div style={labelStyle}>Damages (USD)</div>
            <input value={damages} onChange={(e) => setDamages(e.target.value)} style={fieldStyle} />
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "16px 0" }} />

          <div style={labelStyle}>Case Number</div>
          <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} style={fieldStyle} />

          <div style={{ marginTop: "14px" }}>
            <div style={labelStyle}>Filed Date</div>
            <input value={filedDate} onChange={(e) => setFiledDate(e.target.value)} style={fieldStyle} />
          </div>

          <div style={{ marginTop: "14px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px" }}>
              <div style={labelStyle}>Hearing Date</div>
              <input value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} style={fieldStyle} />
            </div>

            <div style={{ flex: "1 1 220px" }}>
              <div style={labelStyle}>Hearing Time</div>
              <input value={hearingTime} onChange={(e) => setHearingTime(e.target.value)} style={fieldStyle} />
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "16px 0" }} />

          <div style={labelStyle}>Facts (structured)</div>
          <div style={{ fontSize: "13px", color: "#666", maxWidth: "820px", lineHeight: 1.5 }}>
            Add bullet facts. You can edit each line. This is what we’ll use later to generate your narrative and drafts.
          </div>

          <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              placeholder='Add a fact… e.g., "On Jan 5, defendant agreed to repay $2,000 by Feb 1."'
              style={{
                ...fieldStyle,
                maxWidth: "820px",
                flex: "1 1 520px"
              }}
            />
            <button
              type="button"
              onClick={addFact}
              style={{
                border: "2px solid #111",
                background: "#111",
                color: "#fff",
                borderRadius: "12px",
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 900
              }}
            >
              Add Fact
            </button>
          </div>

          {factsItems?.length ? (
            <div style={{ marginTop: "12px", display: "grid", gap: "10px", maxWidth: "820px" }}>
              {factsItems.map((f, idx) => (
                <div
                  key={f.id}
                  style={{
                    border: "1px solid #e6e6e6",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    background: "#fafafa"
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: "12px", color: "#444" }}>Fact {idx + 1}</div>

                  <input
                    value={f.text || ""}
                    onChange={(e) => updateFact(f.id, { text: e.target.value })}
                    style={{ ...fieldStyle, marginTop: "8px", maxWidth: "820px" }}
                  />

                  <div style={{ marginTop: "8px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => deleteFact(f.id)}
                      style={{
                        border: "1px solid #ddd",
                        background: "#fff",
                        borderRadius: "12px",
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontWeight: 900
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>No structured facts yet.</div>
          )}

          <div style={{ marginTop: "18px" }} />

          <div style={labelStyle}>Facts (what happened)</div>
          <textarea
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            placeholder="Optional narrative (freeform). If you prefer, you can leave this blank and rely on the structured facts above."
            style={{
              ...fieldStyle,
              minHeight: "120px",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "12px",
              lineHeight: 1.6
            }}
          />
        </div>
      </Container>

      <Footer />
    </main>
  );
}

const card = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "14px 16px",
  background: "#fff",
  maxWidth: "920px"
};

const labelStyle = { fontWeight: 900, fontSize: "13px", color: "#333" };

const fieldStyle = {
  width: "100%",
  maxWidth: "820px",
  marginTop: "6px",
  borderRadius: "12px",
  border: "1px solid #ddd",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none"
};

