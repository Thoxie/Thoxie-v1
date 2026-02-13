// Path: /app/drafts/page.js
"use client";

import { useEffect, useState } from "react";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import { ROUTES } from "../_config/routes";
import { DraftRepository } from "../_repository/draftRepository";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [caseId, setCaseId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("caseId");
    if (!cid) return;

    const id = String(cid);
    setCaseId(id);

    const list = await DraftRepository.listByCaseId(id);
    setDrafts(Array.isArray(list) ? list : []);
  }

  async function load(q) {
    if (!caseId) return;

    const list = q
      ? await DraftRepository.search(caseId, q)
      : await DraftRepository.listByCaseId(caseId);

    setDrafts(Array.isArray(list) ? list : []);
  }

  async function handleRename(draft) {
    const newTitle = prompt("Enter new draft title:", draft.title);
    if (!newTitle) return;

    await DraftRepository.update(draft.draftId, { title: newTitle });
    await load(query);
  }

  async function handleDuplicate(draftId) {
    await DraftRepository.duplicate(draftId);
    await load(query);
  }

  async function handleDelete(draftId) {
    const ok = confirm("Delete this draft? This cannot be undone.");
    if (!ok) return;

    await DraftRepository.delete(draftId);
    await load(query);
  }

  return (
    <Container>
      <PageTitle>Drafts</PageTitle>

      {caseId ? (
        <div style={{ marginBottom: 12 }}>
          <a href={`${ROUTES.dashboard}?caseId=${encodeURIComponent(caseId)}`}>
            Back to Case Hub
          </a>
        </div>
      ) : null}

      <input
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          load(v);
        }}
        placeholder="Search drafts…"
        style={{ marginBottom: 12, width: "100%" }}
      />

      {drafts.length === 0 ? (
        <p>No drafts found.</p>
      ) : (
        drafts.map((d) => (
          <div
            key={d.draftId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <a href={`${ROUTES.draftPreview}?draftId=${encodeURIComponent(d.draftId)}`}>
                {d.title}
              </a>
              <div style={{ fontSize: 12, color: "#666" }}>
                Updated: {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "—"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => handleRename(d)}>Rename</button>
              <button onClick={() => handleDuplicate(d.draftId)}>Duplicate</button>
              <button onClick={() => handleDelete(d.draftId)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </Container>
  );
}


