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

  async function handleRename() {
    if (!draft) return;

    const newTitle = prompt("Enter new draft title:", draft.title);
    if (!newTitle) return;

    await DraftRepository.update({
      ...draft,
      title: newTitle,
    });

    setDraft({ ...draft, title: newTitle });
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

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button onClick={handleRename}>Rename</button>
        <button onClick={handleDelete}>Delete</button>
      </div>

      <pre style={{ whiteSpace: "pre-wrap" }}>
        {draft.content}
      </pre>
    </Container>
  );
}
