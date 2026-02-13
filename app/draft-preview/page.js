// Path: /app/draft-preview/page.js
"use client";

import { useEffect, useState } from "react";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import { DraftRepository } from "../_repository/draftRepository";

export default function DraftPreviewPage() {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("draftId");
      if (!id) return;

      const d = await DraftRepository.get(id);
      setDraft(d || null);
    }

    load();
  }, []);

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

      <pre style={{ whiteSpace: "pre-wrap" }}>
        {draft.content}
      </pre>
    </Container>
  );
}
