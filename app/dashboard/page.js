// Path: /app/dashboard/page.js
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "thoxie.caseData.v1";

const emptyData = {
  caseNumber: "",
  county: "",
  courtName: "",
  courtAddress: "",
  department: "",
  hearingDate: "",
  hearingTime: "",
  checkInTime: "",
  appearanceType: "In Person",
  role: "Plaintiff",
  claimType: "",
  claimAmount: "",
  incidentDate: "",
  fullName: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  state: "",
  zip: ""
};

export default function DashboardPage() {
  const [data, setData] = useState(emptyData);
  const [saved, setSaved] = useState(false);

  // Load existing system data (intake or prior dashboard edits)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setData({ ...emptyData, ...JSON.parse(stored) });
    } catch {}
  }, []);

  function update(field, value) {
    setData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function saveAll() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Case Dashboard</h1>

        {saved && (
          <div style={styles.savedBanner}>
            ✔ Changes saved successfully
          </div>
        )}

        {/* COURT DETAILS */}
        <Section title="Court & Case Details">
          <Field label="Case Number">
            <Input value={data.caseNumber} onChange={v => update("caseNumber", v)} />
          </Field>

          <Field label="County">
            <Input value={data.county} onChange={v => update("county", v)} />
          </Field>

          <Field label="Court Name">
            <Input value={data.courtName} onChange={v => update("courtName", v)} />
          </Field>

          <Field label="Court Address">
            <Input value={data.courtAddress} onChange={v => update("courtAddress", v)} />
          </Field>

          <Field label="Department / Room">
            <Input value={data.department} onChange={v => update("department", v)} />
          </Field>
        </Section>

        {/* HEARING */}
        <Section title="Hearing Information">
          <Field label="Hearing Date">
            <input
              type="date"
              value={data.hearingDate}
              onChange={e => update("hearingDate", e.target.value)}
              style={styles.input}
            />
          </Field>

          <Field label="Hearing Time">
            <input
              type="time"
              value={data.hearingTime}
              onChange={e => update("hearingTime", e.target.value)}
              style={styles.input}
            />
          </Field>

          <Field label="Check-in Time">
            <input
              type="time"
              value={data.checkInTime}
              onChange={e => update("checkInTime", e.target.value)}
              style={styles.input}
            />
          </Field>

          <Field label="Appearance">
            <select
              value={data.appearanceType}
              onChange={e => update("appearanceType", e.target.value)}
              style={styles.input}
            >
              <option>In Person</option>
              <option>Virtual</option>
              <option>Unknown</option>
            </select>
          </Field>
        </Section>

        {/* CLAIM */}
        <Section title="Claim Summary">
          <Field label="Your Role">
            <select
              value={data.role}
              onChange={e => update("role", e.target.value)}
              style={styles.input}
            >
              <option>Plaintiff</option>
              <option>Defendant</option>
            </select>
          </Field>

          <Field label="Claim Type">
            <Input value={data.claimType} onChange={v => update("claimType", v)} />
          </Field>

          <Field label="Claim Amount">
            <Input value={data.claimAmount} onChange={v => update("claimAmount", v)} />
          </Field>

          <Field label="Incident Date">
            <input
              type="date"
              value={data.incidentDate}
              onChange={e => update("incidentDate", e.target.value)}
              style={styles.input}
            />
          </Field>
        </Section>

        {/* CONTACT */}
        <Section title="Contact Information">
          <Field label="Full Name">
            <Input value={data.fullName} onChange={v => update("fullName", v)} />
          </Field>

          <Field label="Phone">
            <Input value={data.phone} onChange={v => update("phone", v)} />
          </Field>

          <Field label="Email">
            <Input value={data.email} onChange={v => update("email", v)} />
          </Field>

          <Field label="Street">
            <Input value={data.street} onChange={v => update("street", v)} />
          </Field>

          <Field label="City">
            <Input value={data.city} onChange={v => update("city", v)} />
          </Field>

          <Field label="State">
            <Input value={data.state} onChange={v => update("state", v)} />
          </Field>

          <Field label="ZIP">
            <Input value={data.zip} onChange={v => update("zip", v)} />
          </Field>
        </Section>

        <button style={styles.saveButton} onClick={saveAll}>
          Save All Changes
        </button>
      </div>
    </div>
  );
}

/* ---------- Reusable Components ---------- */

function Section({ title, children }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange }) {
  return (
    <input
      style={styles.input}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

/* ---------- Styles ---------- */

const styles = {
  page: {
    background: "#f4f6f8",
    minHeight: "100vh",
    padding: "30px 0"
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 20
  },
  title: {
    fontSize: 34,
    fontWeight: 800,
    marginBottom: 20
  },
  savedBanner: {
    background: "#e6f4ea",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontWeight: 700
  },
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: "0 8px 24px rgba(0,0,0,0.05)"
  },
  cardTitle: {
    marginTop: 0
  },
  field: {
    marginBottom: 14
  },
  label: {
    display: "block",
    fontWeight: 700,
    marginBottom: 6,
    fontSize: 13
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 14
  },
  saveButton: {
    padding: "14px 22px",
    borderRadius: 10,
    border: "2px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer"
  }
};
