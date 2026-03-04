/* Path: /app/_components/ai/ChatBox.jsx */
"use client";

import { useMemo, useState } from "react";
import { sendChat } from "../../_lib/ai/client/sendChat";

import { CaseRepository } from "../../_repository/caseRepository";
import { DocumentRepository } from "../../_repository/documentRepository";

export default function ChatBox({ caseId = null }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const safeCaseId = useMemo(() => (typeof caseId === "string" ? caseId.trim() : ""), [caseId]);

  async function buildCaseSnapshotAndDocs() {
    if (!safeCaseId) return { caseSnapshot: null, documents: [] };

    let caseSnapshot = null;
    try {
      const c = CaseRepository.getById(safeCaseId);
      if (c) {
        caseSnapshot = {
          role: c.role || "",
          category: c.category || "",
          jurisdiction: c.jurisdiction || {},
          caseNumber: c.caseNumber || "",
          hearingDate: c.hearingDate || "",
          hearingTime: c.hearingTime || "",
          amountClaimed: String(c?.claim?.amount ?? c?.damages ?? ""),
          // Map existing intake narrative into the field expected by readiness + chat context
          factsSummary: c.facts || "",
        };
      }
    } catch {
      caseSnapshot = null;
    }

    let documents = [];
    try {
      const rows = await DocumentRepository.listByCaseId(safeCaseId);
      const list = Array.isArray(rows) ? rows : [];
      // Do NOT send blobs to the server. Only send safe metadata.
      documents = list.slice(0, 150).map((d) => ({
        docId: d.docId,
        caseId: d.caseId,
        name: d.name,
        size: d.size,
        mimeType: d.mimeType,
        uploadedAt: d.uploadedAt,
        docType: d.docType,
        docTypeLabel: d.docTypeLabel,
        exhibitDescription: d.exhibitDescription,
        evidenceCategory: d.evidenceCategory,
        evidenceSupports: d.evidenceSupports,
        extractedText: d.extractedText,
      }));
    } catch {
      documents = [];
    }

    return { caseSnapshot, documents };
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input.trim() }];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { caseSnapshot, documents } = await buildCaseSnapshotAndDocs();
      const res = await sendChat({ messages: newMessages, caseId: safeCaseId, caseSnapshot, documents });
      setMessages([...newMessages, res.reply || { role: "assistant", content: "(no response)" }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Error contacting AI." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ minHeight: 300, border: "1px solid #ccc", padding: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", marginTop: 8 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask THOXIE..."
        />
        <button onClick={handleSend} disabled={loading} style={{ marginLeft: 8 }}>
          Send
        </button>
      </div>
    </div>
  );
}
