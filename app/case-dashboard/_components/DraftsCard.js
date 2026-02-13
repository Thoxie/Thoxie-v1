// Path: /app/case-dashboard/_components/DraftsCard.js
"use client";

import { useEffect, useState } from "react";
import { DraftRepository } from "../../_repository/draftRepository";

export default function DraftsCard({ caseId }) {
  const [drafts, setDrafts] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    load();
  }, [caseId]);

  async function load() {
    if (!caseId) return;
    const list = await DraftRepository.search(caseId, query);
    setDrafts(Array.isArray(list) ? list : []);
  }

  async function handleDelete(id) {
    await DraftRepository.delete(id);
    load();
  }

  async function handleRename(draft) {
    const title = prompt("New title:", draft.title);
    if (!title) return;
    await DraftRepository.update({ ...draft, title });
    load();
  }

  async function handleDuplicate(id) {
    await DraftRepository.duplicate(id);
    load();
  }

  return (
    <div>
      <h3>Drafts</h3>

      <input
        placeholder="Search drafts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyUp={load}
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
    </div>
  );
}

