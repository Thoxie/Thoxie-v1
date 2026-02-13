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
    const id = new URLSearchParams(window.location.search).get("draftId");
    if (!id) return;
    const d = await DraftRepository.get(id);
    setDraft(d);
  }

  if (!draft) return null;

  return (
    <Container>
      <PageTitle>{draft.title}</PageTitle>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {draft.content}
      </pre>
    </Container>
  );
}

