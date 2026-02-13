// Path: /app/case-dashboard/_components/DraftsCard.js
"use client";

import { useEffect, useState } from "react";
import { DraftRepository } from "../../_repository/draftRepository";

export default function DraftsCard({ caseId }) {
  const [drafts, setDrafts] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    load("");
  }, [caseId]);

  async function load(q) {
    if (!caseId) return;
    const list = q
      ? await DraftRepository.search(caseId, q)
      : await DraftRepository.listByCaseId(caseId);
    setDrafts(Array.isArray(list) ? list : []);
  }

  async function handleDelete(draftId) {
    const ok = confirm("Delete this draft? This cannot be undone.");
    if (!ok) return;

    await DraftRepository.delete(draftId);
    await load(query);
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

  return (
    <div>
      <h3>Drafts</h3>

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
              marginBottom: 8,
            }}
          >
            <a href={`/draft-preview?draftId=${d.draftId}`}>{d.title}</a>

            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => handleRename(d)}>Rename</button>
              <button onClick={() => handleDuplicate(d.draftId)}>
                Duplicate
              </button>
              <button onClick={() => handleDelete(d.draftId)}>Delete</button>
            </div>
          </div>
        ))
      )}

      {caseId ? (
        <div style={{ marginTop: 10 }}>
          <a href={`/drafts?caseId=${encodeURIComponent(caseId)}`}>
            View all drafts
          </a>
        </div>
      ) : null}
    </div>
  );
}
