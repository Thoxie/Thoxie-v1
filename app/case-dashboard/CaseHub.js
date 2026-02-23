// Path: /app/case-dashboard/CaseHub.js
"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../_components/Container";
import EmptyState from "../_components/EmptyState";
import PageTitle from "../_components/PageTitle";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

/* Draft support (preserved; wired to "Generate Packet") */
import { DraftRepository } from "../_repository/draftRepository";
import { generateSmallClaimsDraft } from "../_lib/draftGenerator";
import { createDraftRecord } from "../_schemas/draftSchema";

import NextActionsCard from "./NextActionsCard";

function safeStr(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function toMoneyNumber(v) {
  const s = safeStr(v).replace(/[^0-9.]/g, "");
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) ? n : "";
}

function formatMoneyDisplay(v) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "";
  return String(n.toFixed(2)).replace(/\.00$/, "");
}

function buildIcs({ title, description, startLocal }) {
  if (!startLocal?.date || !startLocal?.time) return "";
  const dt = `${startLocal.date}T${startLocal.time}:00`;
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtStart = dt.replace(/[-:]/g, "");
  const uid = `thoxie-${Date.now()}@thoxie.local`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//THOXIE//Case Dashboard//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `SUMMARY:${(title || "Court Hearing").replace(/\n/g, " ")}`,
    `DESCRIPTION:${(description || "").replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

function openDownloadText(filename, content, mime = "text/plain") {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // no-op
  }
}

function getInitialForm(caseRecord) {
  const jurisdiction = caseRecord?.jurisdiction || {};
  const claim = caseRecord?.claim || {};
  const parties = caseRecord?.parties || {};

  const addressParts = parties?.plaintiffAddressParts || {};
  const addrStreet = safeStr(addressParts.street || "");
  const addrCity = safeStr(addressParts.city || "");
  const addrState = safeStr(addressParts.state || "");
  const addrZip = safeStr(addressParts.zip || "");

  return {
    // Court & Case Details
    caseNumber: safeStr(caseRecord?.caseNumber || ""),
    county: safeStr(jurisdiction?.county || ""),
    courtName: safeStr(jurisdiction?.courtName || ""),
    courtAddress: safeStr(jurisdiction?.courtAddress || ""),
    department: safeStr(jurisdiction?.department || ""),

    // Hearing Information
    hearingDate: safeStr(caseRecord?.hearingDate || ""),
    hearingTime: safeStr(caseRecord?.hearingTime || ""),
    checkInTime: safeStr(caseRecord?.checkInTime || ""),
    appearanceType: safeStr(caseRecord?.appearanceType || "In Person"),

    // Claim Summary
    role: safeStr(caseRecord?.role || "Plaintiff"),
    claimType: safeStr(claim?.type || claim?.reason || ""),
    claimAmount: safeStr(
      claim?.amount !== undefined && claim?.amount !== null && safeStr(claim?.amount) !== ""
        ? claim.amount
        : caseRecord?.damages ?? ""
    ),
    incidentDate: safeStr(claim?.incidentDate || ""),

    // Your Contact Information (plaintiff)
    fullName: safeStr(parties?.plaintiff || ""),
    phone: safeStr(parties?.plaintiffPhone || ""),
    email: safeStr(parties?.plaintiffEmail || ""),
    street: addrStreet,
    city: addrCity,
    state: addrState,
    zip: addrZip,
  };
}

function saveCaseWithForm(caseRecord, form) {
  const next = { ...(caseRecord || {}) };

  // Court / jurisdiction
  next.caseNumber = safeStr(form.caseNumber);
  next.jurisdiction = {
    ...(caseRecord?.jurisdiction || {}),
    county: safeStr(form.county),
    courtName: safeStr(form.courtName),
    courtAddress: safeStr(form.courtAddress),
    department: safeStr(form.department),
  };

  // Hearing
  next.hearingDate = safeStr(form.hearingDate);
  next.hearingTime = safeStr(form.hearingTime);
  next.checkInTime = safeStr(form.checkInTime);
  next.appearanceType = safeStr(form.appearanceType || "In Person");

  // Role
  next.role = safeStr(form.role || "Plaintiff");

  // Claim
  const amountRaw = safeStr(form.claimAmount);
  const amountNumber = toMoneyNumber(amountRaw);
  next.claim = {
    ...(caseRecord?.claim || {}),
    type: safeStr(form.claimType),
    reason: safeStr(form.claimType),
    amount: amountNumber === "" ? amountRaw : amountNumber,
    incidentDate: safeStr(form.incidentDate),
  };

  // Back-compat: also fill damages
  if (amountNumber !== "") next.damages = amountNumber;
  else next.damages = amountRaw;

  // Contact (plaintiff)
  next.parties = {
    ...(caseRecord?.parties || {}),
    plaintiff: safeStr(form.fullName),
    plaintiffPhone: safeStr(form.phone),
    plaintiffEmail: safeStr(form.email),
    plaintiffAddressParts: {
      street: safeStr(form.street),
      city: safeStr(form.city),
      state: safeStr(form.state),
      zip: safeStr(form.zip),
    },
    plaintiffAddress: [form.street, form.city, form.state, form.zip]
      .map((x) => safeStr(x).trim())
      .filter(Boolean)
      .join(", "),
  };

  return CaseRepository.save(next);
}

function Card({ title, children, rightHeader }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{title}</div>
        {rightHeader ? <div style={styles.cardHeaderRight}>{rightHeader}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <div style={styles.label}>{children}</div>;
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={styles.input}
    />
  );
}

function Select({ value, onChange, options = [] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.input}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Btn({ children, onClick, variant = "outline", disabled = false, title }) {
  const s =
    variant === "outline"
      ? styles.btnOutline
      : variant === "ghost"
      ? styles.btnGhost
      : styles.btnSolid;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={{
        ...s,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState("");

  const [savedPulse, setSavedPulse] = useState({
    caseDetails: false,
    hearing: false,
    claim: false,
    contact: false,
  });

  const [form, setForm] = useState(null);

  async function refreshDocs(id) {
    try {
      const list = await DocumentRepository.listByCaseId(id);
      setDocs(Array.isArray(list) ? list : []);
    } catch {
      setDocs([]);
    }
  }

  function pulseSaved(key) {
    setSavedPulse((s) => ({ ...s, [key]: true }));
    window.setTimeout(() => setSavedPulse((s) => ({ ...s, [key]: false })), 1200);
  }

  async function handleGeneratePacket() {
    if (!caseRecord) return;

    try {
      const draftData = generateSmallClaimsDraft(caseRecord);
      const draftRecord = createDraftRecord({ caseId, ...draftData });
      await DraftRepository.create(draftRecord);
      window.location.href = `/draft-preview?draftId=${draftRecord.draftId}`;
    } catch {
      setErr("Failed to generate packet.");
    }
  }

  useEffect(() => {
    setErr("");
    try {
      const c = CaseRepository.getById(caseId);
      setCaseRecord(c || null);
      setForm(getInitialForm(c || null));
    } catch {
      setCaseRecord(null);
      setForm(getInitialForm(null));
    }
    refreshDocs(caseId);
  }, [caseId]);

  const subtitle = useMemo(() => {
    const county = caseRecord?.jurisdiction?.county || "";
    const court = caseRecord?.jurisdiction?.courtName || "";
    if (county || court) return `${county || "CA"} · ${court || "Court"}`;
    return `Case ID: ${caseId}`;
  }, [caseId, caseRecord]);

  const docCounts = useMemo(() => {
    const list = Array.isArray(docs) ? docs : [];
    const evidence = list.filter((d) => (d?.docType || "evidence") !== "pleading").length;
    const court = list.filter((d) => (d?.docType || "") === "pleading").length;
    return { evidence, court, total: list.length };
  }, [docs]);

  const formsGeneratedLabel = useMemo(() => {
    return "None";
  }, []);

  if (!caseRecord) {
    return (
      <Container>
        <div style={{ padding: "18px 0" }}>
          <PageTitle>Case Dashboard</PageTitle>
          <EmptyState
            title="Case not found"
            message="This caseId does not exist in your local storage."
            ctaHref={ROUTES.dashboard}
            ctaLabel="Back to Case List"
          />
        </div>
      </Container>
    );
  }

  if (!form) return null;

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <div style={styles.topRow}>
          <div>
            <div style={styles.h1}>Case Dashboard</div>
            <div style={styles.sub}>{subtitle}</div>
          </div>
          <div style={styles.activeCase}>Active Case</div>
        </div>

        {err ? <div style={styles.errorBox}>{err}</div> : null}

        <div style={styles.grid2}>
          <Card title="Court & Case Details">
            <div style={styles.stack}>
              <div>
                <Label>Case Number</Label>
                <Input
                  value={form.caseNumber}
                  onChange={(v) => setForm((f) => ({ ...f, caseNumber: v }))}
                  placeholder="Enter case number"
                />
              </div>

              <div>
                <Label>County</Label>
                <Input
                  value={form.county}
                  onChange={(v) => setForm((f) => ({ ...f, county: v }))}
                  placeholder="Enter county"
                />
              </div>

              <div>
                <Label>Court Name</Label>
                <Input
                  value={form.courtName}
                  onChange={(v) => setForm((f) => ({ ...f, courtName: v }))}
                  placeholder="Enter court name"
                />
              </div>

              <div>
                <Label>Court Address</Label>
                <Input
                  value={form.courtAddress}
                  onChange={(v) => setForm((f) => ({ ...f, courtAddress: v }))}
                  placeholder="Street address"
                />
              </div>

              <div>
                <Label>Department / Room</Label>
                <Input
                  value={form.department}
                  onChange={(v) => setForm((f) => ({ ...f, department: v }))}
                  placeholder="Dept or courtroom"
                />
              </div>

              <div style={styles.btnRow}>
                <Btn
                  variant="outline"
                  onClick={() => {
                    try {
                      const next = saveCaseWithForm(caseRecord, form);
                      setCaseRecord(next);
                      pulseSaved("caseDetails");
                    } catch {
                      setErr("Failed to save case details.");
                    }
                  }}
                  title="Save Court & Case Details"
                >
                  {savedPulse.caseDetails ? "Saved ✓" : "Save Case Details"}
                </Btn>

                <Btn
                  variant="outline"
                  onClick={() => {
                    window.location.href = `${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}`;
                  }}
                  title="Upload official court documents to help you fill fields later"
                >
                  Import From Court Notice / Summons
                </Btn>
              </div>

              <div style={styles.helpText}>
                Upload official court documents to auto-fill fields. (Parsing is coming soon.)
              </div>
            </div>
          </Card>

          <Card title="Hearing Information">
            <div style={styles.stack}>
              <div>
                <Label>Hearing Date</Label>
                <Input
                  value={form.hearingDate}
                  onChange={(v) => setForm((f) => ({ ...f, hearingDate: v }))}
                  placeholder="mm/dd/yyyy"
                />
              </div>

              <div>
                <Label>Hearing Time</Label>
                <Input
                  value={form.hearingTime}
                  onChange={(v) => setForm((f) => ({ ...f, hearingTime: v }))}
                  placeholder="--:-- --"
                />
              </div>

              <div>
                <Label>Check-in Time (if different)</Label>
                <Input
                  value={form.checkInTime}
                  onChange={(v) => setForm((f) => ({ ...f, checkInTime: v }))}
                  placeholder="--:-- --"
                />
              </div>

              <div>
                <Label>Virtual / In Person</Label>
                <Select
                  value={form.appearanceType}
                  onChange={(v) => setForm((f) => ({ ...f, appearanceType: v }))}
                  options={["In Person", "Virtual"]}
                />
              </div>

              <div style={styles.btnRow}>
                <Btn
                  variant="outline"
                  onClick={() => {
                    try {
                      const next = saveCaseWithForm(caseRecord, form);
                      setCaseRecord(next);
                      pulseSaved("hearing");
                    } catch {
                      setErr("Failed to save hearing info.");
                    }
                  }}
                >
                  {savedPulse.hearing ? "Saved ✓" : "Save Hearing Info"}
                </Btn>

                <Btn
                  variant="outline"
                  disabled={!form.hearingDate || !form.hearingTime}
                  onClick={() => {
                    const date = safeStr(form.hearingDate).trim();
                    const time = safeStr(form.hearingTime).trim();

                    let ymd = "";
                    const m = date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
                    if (m) {
                      const mm = String(m[1]).padStart(2, "0");
                      const dd = String(m[2]).padStart(2, "0");
                      let yy = String(m[3]);
                      if (yy.length === 2) yy = `20${yy}`;
                      ymd = `${yy}-${mm}-${dd}`;
                    }

                    let hhmm = "";
                    const t = time.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
                    if (t) {
                      let hh = Number(t[1]);
                      const mm = String(t[2]).padStart(2, "0");
                      const ap = (t[3] || "").toLowerCase();
                      if (ap === "pm" && hh < 12) hh += 12;
                      if (ap === "am" && hh === 12) hh = 0;
                      hhmm = `${String(hh).padStart(2, "0")}:${mm}`;
                    }

                    const ics = buildIcs({
                      title: "Court hearing",
                      description: `${caseRecord?.jurisdiction?.courtName || ""} ${
                        caseRecord?.caseNumber ? `(${caseRecord.caseNumber})` : ""
                      }`,
                      startLocal: { date: ymd, time: hhmm },
                    });

                    if (!ics) return;
                    openDownloadText("thoxie-hearing.ics", ics, "text/calendar");
                  }}
                  title={!form.hearingDate || !form.hearingTime ? "Enter hearing date and time first" : "Download calendar invite"}
                >
                  Add to Calendar
                </Btn>
              </div>
            </div>
          </Card>

          <Card title="Claim Summary">
            <div style={styles.stack}>
              <div>
                <Label>Your Role</Label>
                <Select
                  value={form.role}
                  onChange={(v) => setForm((f) => ({ ...f, role: v }))}
                  options={["Plaintiff", "Defendant"]}
                />
              </div>

              <div>
                <Label>Claim Type</Label>
                <Input
                  value={form.claimType}
                  onChange={(v) => setForm((f) => ({ ...f, claimType: v }))}
                  placeholder="e.g., Property damage"
                />
              </div>

              <div>
                <Label>Claim Amount</Label>
                <Input
                  value={formatMoneyDisplay(form.claimAmount)}
                  onChange={(v) => setForm((f) => ({ ...f, claimAmount: v }))}
                  placeholder="$"
                />
              </div>

              <div>
                <Label>Incident Date</Label>
                <Input
                  value={form.incidentDate}
                  onChange={(v) => setForm((f) => ({ ...f, incidentDate: v }))}
                  placeholder="mm/dd/yyyy"
                />
              </div>

              <div style={styles.btnRow}>
                <Btn
                  variant="outline"
                  onClick={() => {
                    try {
                      const next = saveCaseWithForm(caseRecord, form);
                      setCaseRecord(next);
                      pulseSaved("claim");
                    } catch {
                      setErr("Failed to save claim info.");
                    }
                  }}
                >
                  {savedPulse.claim ? "Saved ✓" : "Save Claim Info"}
                </Btn>

                <Btn
                  variant="outline"
                  onClick={() => {
                    window.location.href = `${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`;
                  }}
                >
                  Edit Intake
                </Btn>
              </div>
            </div>
          </Card>

          <Card title="Your Contact Information">
            <div style={styles.stack}>
              <div>
                <Label>Full Name</Label>
                <Input
                  value={form.fullName}
                  onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  placeholder="Phone number"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  placeholder="Email address"
                />
              </div>

              <div>
                <Label>Address</Label>
                <Input
                  value={form.street}
                  onChange={(v) => setForm((f) => ({ ...f, street: v }))}
                  placeholder="Street"
                />
              </div>

              <div>
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                  placeholder="City"
                />
              </div>

              <div>
                <Label>State</Label>
                <Input
                  value={form.state}
                  onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                  placeholder="State"
                />
              </div>

              <div>
                <Label>ZIP Code</Label>
                <Input
                  value={form.zip}
                  onChange={(v) => setForm((f) => ({ ...f, zip: v }))}
                  placeholder="ZIP"
                />
              </div>

              <div style={styles.btnRow}>
                <Btn
                  variant="outline"
                  onClick={() => {
                    try {
                      const next = saveCaseWithForm(caseRecord, form);
                      setCaseRecord(next);
                      pulseSaved("contact");
                    } catch {
                      setErr("Failed to save contact info.");
                    }
                  }}
                >
                  {savedPulse.contact ? "Saved ✓" : "Save Contact Info"}
                </Btn>
              </div>
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
          <Card title="Documents">
            <div style={{ lineHeight: 1.9 }}>
              <div>Evidence Files Uploaded: {docCounts.evidence}</div>
              <div>Court Documents Uploaded: {docCounts.court}</div>
              <div>Forms Generated: {formsGeneratedLabel}</div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <Btn
                variant="outline"
                onClick={() => {
                  window.location.href = `${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}`;
                }}
              >
                Upload Documents
              </Btn>

              <Btn
                variant="outline"
                onClick={() => {
                  window.location.href = `${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}`;
                }}
              >
                View Documents
              </Btn>

              <Btn variant="outline" onClick={handleGeneratePacket}>
                Generate Packet
              </Btn>
            </div>
          </Card>

          <NextActionsCard caseRecord={caseRecord} docs={docs} />
        </div>
      </div>
    </Container>
  );
}

const styles = {
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  h1: { fontSize: 46, fontWeight: 900, letterSpacing: "-0.02em" },
  sub: { marginTop: 6, fontWeight: 800, color: "#444" },
  activeCase: { fontSize: 22, fontWeight: 900, marginTop: 10 },

  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    fontSize: 13,
  },

  grid2: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },

  card: {
    borderRadius: 16,
    background: "#fff",
    padding: 18,
    boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
    border: "1px solid #eee",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 20, fontWeight: 900, marginBottom: 8 },
  cardHeaderRight: { fontWeight: 800, color: "#555" },

  stack: { display: "grid", gap: 12 },

  label: { fontSize: 13, fontWeight: 900, marginBottom: 6, color: "#333" },
  input: {
    width: "100%",
    border: "1px solid #d7d7d7",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 16,
    outline: "none",
    background: "#fff",
  },

  btnRow: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 },
  btnOutline: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "2px solid #111",
    background: "#fff",
    fontWeight: 900,
  },
  btnSolid: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "2px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
  },
  btnGhost: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    fontWeight: 900,
  },

  helpText: { marginTop: -6, color: "#666", fontSize: 13, fontWeight: 700 },
};



