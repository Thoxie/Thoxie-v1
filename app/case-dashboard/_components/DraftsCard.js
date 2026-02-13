// Path: /app/case-dashboard/_components/DraftsCard.js
"use client";

import { useEffect, useState } from "react";
import { DraftRepository } from "../../_repository/draftRepository";

export default function DraftsCard({ caseId }) {
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    load();
  }, [caseId]);

  async function load() {
    if (!caseId) return;
    const list = await DraftRepository.listByCaseId(caseId);
    setDrafts(Array.isArray(list) ? list : []);
  }

  async function handleDelete(draftId) {
    await DraftRepository.delete(draftId);
    await load();
  }

  async function handleRename(draft) {
    const newTitle = prompt("Enter new draft title:", draft.title);
    if (!newTitle) return;

    await DraftRepository.update({
      ...draft,
      title: newTitle,
    });

    await load();
  }

  async function handleDuplicate(draftId) {
    await DraftRepository.duplicate(draftId);
    await load();
  }

  return (
    <div>
      <h3>Drafts</h3>

      {drafts.length === 0 ? (
        <p>No drafts yet.</p>
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
            <a href={`/draft-preview?draftId=${d.draftId}`}>
              {d.title}
            </a>

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
