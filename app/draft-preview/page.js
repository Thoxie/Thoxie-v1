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

    const ok = confirm("Delete this draft? This cannot be undone.");
    if (!ok) return;

    await DraftRepository.delete(draft.draftId);
    window.history.back();
  }

  async function handleRename() {
    if (!draft) return;

    const newTitle = prompt("Enter new draft title:", draft.title);
    if (!newTitle) return;

    const updated = await DraftRepository.update(draft.draftId, {
      title: newTitle,
    });

    setDraft(updated || { ...draft, title: newTitle });
  }

  async function handleDuplicate() {
    if (!draft) return;

    const copy = await DraftRepository.duplicate(draft.draftId);
    if (copy?.draftId) {
      window.location.href = `/draft-preview?draftId=${copy.draftId}`;
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    if (!draft) return;

    const filenameBase = (draft.title || "draft").replace(/[\\/:*?"<>|]+/g, "-");

    const blob = new Blob([draft.content || ""], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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

      <div style={{ marginBottom: 12 }}>
        <a href={`/drafts?caseId=${encodeURIComponent(draft.caseId)}`}>
          Back to Drafts
        </a>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button onClick={handleRename}>Rename</button>
        <button onClick={handleDuplicate}>Duplicate</button>
        <button onClick={handleDownload}>Download</button>
        <button onClick={handlePrint}>Print</button>
        <button onClick={handleDelete}>Delete</button>
      </div>

      <pre style={{ whiteSpace: "pre-wrap" }}>{draft.content}</pre>
    </Container>
  );
}

