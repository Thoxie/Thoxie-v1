// Path: /app/draft-preview/page.js
"use client";

import { useEffect, useState } from "react";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import { DraftRepository } from "../_repository/draftRepository";

export default function DraftPreviewPage() {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("draftId");
    if (!id) return;

    const d = await DraftRepository.get(id);
    setDraft(d || null);
  }

  async function handleDelete() {
    if (!draft) return;
    await DraftRepository.delete(draft.draftId);
    window.history.back();
  }

  if (!draft) {
    return (
      <Container>
        <PageTitle>Draft Preview</PageTitle>
        <p>Draft not found.</p>
      </Container>
    );
  }

  return (
    <Container>
      <PageTitle>{draft.title}</PageTitle>

      <div style={{ marginBottom: 16 }}>
        <button onClick={handleDelete}>Delete Draft</button>
      </div>

      <pre style={{ whiteSpace: "pre-wrap" }}>
        {draft.content}
      </pre>
    </Container>
  );
}
