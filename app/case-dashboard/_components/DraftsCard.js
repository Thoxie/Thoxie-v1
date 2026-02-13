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

  if (drafts.length === 0) {
    return (
      <div>
        <h3>Drafts</h3>
        <p>No drafts yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3>Drafts</h3>
      {drafts.map((d) => (
        <div key={d.draftId} style={{ marginBottom: 8 }}>
          <a href={`/draft-preview?draftId=${d.draftId}`}>
            {d.title}
          </a>
        </div>
      ))}
    </div>
  );
}

