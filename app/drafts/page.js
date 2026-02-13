// Path: /app/drafts/page.js
"use client";

import { useEffect, useState } from "react";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import { DraftRepository } from "../_repository/draftRepository";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    loadDrafts();
  }, []);

  async function loadDrafts() {
    const all = await DraftRepository.listByCaseId(
      new URLSearchParams(window.location.search).get("caseId")
    );
    setDrafts(all);
  }

  return (
    <Container>
      <PageTitle>Drafts</PageTitle>

      {drafts.length === 0 && <p>No drafts yet.</p>}

      {drafts.map((d) => (
        <div key={d.draftId} style={{ marginBottom: 16 }}>
          <a href={`/draft-preview?draftId=${d.draftId}`}>
            {d.title}
          </a>
        </div>
      ))}
    </Container>
  );
}

