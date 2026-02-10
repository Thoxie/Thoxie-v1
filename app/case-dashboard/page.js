"use client";

import { useEffect, useState } from "react";
import { CaseRepository } from "../_repository/caseRepository";

export default function CaseDashboardPage() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    setCases(CaseRepository.getAll());
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Your Cases</h1>

      {cases.length === 0 && (
        <p>No cases yet. Start a new case to see it here.</p>
      )}

      <ul style={{ marginTop: "1rem" }}>
        {cases.map(c => (
          <li
            key={c.id}
            style={{
              border: "1px solid #ccc",
              padding: "1rem",
              marginBottom: "1rem"
            }}
          >
            <strong>{c.jurisdiction.county} County</strong>
            <div>Role: {c.role}</div>
            <div>Category: {c.category}</div>
            <div>Status: {c.status}</div>
            <div style={{ fontSize: "0.85rem", color: "#666" }}>
              Created: {new Date(c.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
