// Path: /src/components/AIChatbox.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaseRepository } from "../../app/_repository/caseRepository";
import { DocumentRepository } from "../../app/_repository/documentRepository";

function storageKey(caseId) {
  return `thoxie.aiChat.v1.${caseId || "no-case"}`;
}

function betaKey() {
  return "thoxie.betaId.v1";
}

function ragMetaKey(caseId) {
  return `thoxie.ragSyncMeta.v1.${caseId || "no-case"}`;
}

function getLocalRagMeta(caseId) {
  try {
    const raw = localStorage.getItem(ragMetaKey(caseId));
    return raw ? safeJsonParse(raw, null) : null;
  } catch {
    return null;
  }
}

function setLocalRagMeta(caseId, meta) {
  try {
    localStorage.setItem(ragMetaKey(caseId), JSON.stringify(meta || {}));
  } catch {
    // ignore
  }
}

function nowTs() {
  return new Date().toISOString();
}

function safeJsonParse(s, fallback) {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

async function blobToBase64(blob, maxBytes) {
  if (!blob) return null;
  if (typeof blob.size === "number" && blob.size > maxBytes) return { ok: false, reason: "too_large" };

  const ab = await blob.arrayBuffer();
  const bytes = ab.byteLength;
  if (bytes > maxBytes) return { ok: false, reason: "too_large" };

  // KEEP EXISTING BEHAVIOR (do not change Buffer usage here)
  const buf = Buffer.from(ab);
  return { ok: true, base64: buf.toString("base64"), bytes };
}

export default function AIChatbox({ caseId: caseIdProp, onClose }) {
  const [caseId, setCaseId] = useState(caseIdProp || "");
  const [cases, setCases] = useState([]);
  const [docs, setDocs] = useState([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [banner, setBanner] = useState("");
  const [serverPending, setServerPending] = useState(false);

  // Beta allowlist tester id (sent to server; not authentication)
  const [testerId, setTesterId] = useState("");

  // RAG sync state
  const [ragStatus, setRagStatus] = useState({ synced: false, last: "" });

  const listRef = useRef(null);
  const textareaRef = useRef(null);

  // UI-only guardrails (no behavior change to server)
  const MAX_INPUT_CHARS = 2000;

  const selectedCase = useMemo(() => {
    if (!caseId) return null;
    return CaseRepository.getById(caseId);
  }, [caseId, cases]);

  useEffect(() => {
    const all = CaseRepository.getAll();
    setCases(all);
  }, []);

  useEffect(() => {
    if (caseIdProp && caseIdProp !== caseId) setCaseId(caseIdProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseIdProp]);

  useEffect(() => {
    // Load beta id from localStorage (UI only)
    try {
      const v = localStorage.getItem(betaKey());
      if (v && !testerId) setTesterId(String(v || ""));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Persist beta id (UI only)
    try {
      if (testerId) localStorage.setItem(betaKey(), testerId);
    } catch {
      // ignore
    }
  }, [testerId]);

  useEffect(() => {
    // Load chat history for the selected case
    try {
      const raw = localStorage.getItem(storageKey(caseId));
      const saved = raw ? safeJsonParse(raw, []) : [];
      if (Array.isArray(saved) && saved.length) {
        setMessages(saved);
      } else {
        setMessages([
          {
            id: crypto.randomUUID(),
            role: "assistant",
            ts: nowTs(),
            text:
              "AI Assistant is active. Phase-1 RAG is available: click “Sync Docs” to index text-like documents for evidence-based retrieval (no OpenAI required)."
          }
        ]);
      }
    } catch {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          ts: nowTs(),
          text:
            "AI Assistant is active. Phase-1 RAG is available: click “Sync Docs” to index text-like documents for evidence-based retrieval (no OpenAI required)."
        }
      ]);
    }
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!caseId) {
        setDocs([]);
        return;
      }
      const rows = await DocumentRepository.listByCaseId(caseId);
      if (!cancelled) setDocs(rows || []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    // Refresh server RAG status whenever the selected case changes.
    // (Server index is in-memory and may be empty after cold start.)
    if (caseId) {
      refreshRagStatusFromServer("case-change");
    } else {
      setRagStatus({ synced: false, last: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    localStorage.setItem(storageKey(caseId), JSON.stringify(messages || []));
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, caseId]);

  function pushBanner(msg) {
    setBanner(msg);
    window.clearTimeout(pushBanner._t);
    pushBanner._t = window.setTimeout(() => setBanner(""), 2200);
  }

  function addMessage(role, text) {
    const m = {
      id: crypto.randomUUID(),
      role,
      ts: nowTs(),
      text: String(text || "").trim()
    };
    setMessages((prev) => [...prev, m]);
  }

  function buildCaseSnapshot(c) {
    if (!c) return null;
    return {
      caseId: c.caseId || c.id || "",
      state: c.state || "CA",
      county: c.county || "",
      court: c.court || "",
      role: c.role || "",
      claimType: c.claimType || "",
      createdAt: c.createdAt || "",
      updatedAt: c.updatedAt || ""
    };
  }

  function buildDocumentInventory(rows) {
    return (rows || []).map((obj) => {
      return {
        id: obj.id || obj.docId || "",
        name: obj.name || obj.filename || obj.originalName || "",
        mimeType: obj.mimeType || obj.kind || obj.type || "",
        size: obj.size || (obj.blob ? obj.blob.size : 0),
        extractedTextChars: typeof obj.extractedText === "string" ? obj.extractedText.length : 0,
        exhibit: obj.exhibit || "",
        description: obj.exhibitDescription || obj.description || "",
        uploadedAt: obj.uploadedAt || obj.createdAt || obj.updatedAt || ""
      };
    });
  }

  function toApiMessages(nextMsgs) {
    return (nextMsgs || []).map((m) => ({
      role: m.role,
      content: m.text
    }));
  }

  async function refreshRagStatusFromServer(reason) {
    if (!caseId) {
      setRagStatus((prev) => ({ ...prev, synced: false }));
      return;
    }

    // Server-side RAG index is in-memory and can reset on cold starts.
    // If the user previously synced locally but server has 0 docs, show a clear banner.
    const localMeta = getLocalRagMeta(caseId);
    const hadPriorSync = !!(localMeta && localMeta.lastSyncedAt);

    try {
      const res = await fetch("/api/rag/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
        cache: "no-store"
      });

      if (!res.ok) throw new Error(`status_${res.status}`);

      const data = await res.json().catch(() => ({}));
      const serverDocs = Array.isArray(data?.docs) ? data.docs.length : 0;
      const serverHasIndex = serverDocs > 0;

      setRagStatus((prev) => ({
        ...prev,
        synced: serverHasIndex,
        last: serverHasIndex ? new Date().toLocaleString() : prev.last
      }));

      if (!serverHasIndex && hadPriorSync) {
        pushBanner("RAG index is empty (server cold start). Click “Sync Docs” again.");
      }
    } catch {
      // If status check fails, do not change behavior; keep current UI state.
      // (Avoid breaking chat due to status endpoint issues.)
      if (hadPriorSync && reason === "case-change") {
        // Optional gentle hint; do not spam.
        pushBanner("RAG status unavailable. If snippets seem missing, click “Sync Docs”.");
      }
    }
  }

  // Sync docs from IndexedDB -> server index (Phase-1: text-like base64 only)
  async function syncDocsToServer() {
    if (!caseId) {
      pushBanner("Select a case first.");
      return;
    }

    if (serverPending) {
      pushBanner("Please wait — request in progress.");
      return;
    }

    pushBanner("Syncing docs to server index…");

    const rows = await DocumentRepository.listByCaseId(caseId);
    const payloadDocs = [];

    const maxDocs = 12;
    const maxBytes = 1_500_000;

    for (const d of (rows || []).slice(0, maxDocs)) {
      const docId = d.id || d.docId || "";
      const name = d.name || d.filename || d.originalName || "(unnamed)";
      const mimeType = d.mimeType || d.kind || d.type || "";

      const extractedText = typeof d.extractedText === "string" ? d.extractedText : "";

      let base64 = null;

      if (!extractedText && d.blob) {
        const res = await blobToBase64(d.blob, maxBytes);
        if (res && res.ok) base64 = res.base64;
      }

      payloadDocs.push({
        docId,
        name,
        mimeType,
        text: extractedText || undefined,
        base64: base64 || undefined
      });
    }

    const res = await fetch("/api/rag/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, documents: payloadDocs })
    });

    if (!res.ok) {
      pushBanner("Sync failed (server).");
      return;
    }

    const data = await res.json();
    const okCount = (data?.indexed || []).filter((x) => x.ok).length;

    // Persist local sync metadata so we can warn if the server index resets (cold start).
    setLocalRagMeta(caseId, {
      lastSyncedAt: Date.now(),
      indexedOk: okCount,
      total: (data?.indexed || []).length
    });

    setRagStatus({ synced: true, last: new Date().toLocaleString() });

    // Refresh server status after ingest completes (may still be empty if nothing indexable).
    await refreshRagStatusFromServer("post-sync");

    pushBanner(`RAG sync complete: ${okCount} indexed.`);
    addMessage(
      "assistant",
      `RAG sync report:\nIndexed: ${okCount}/${(data?.indexed || []).length}\nNote: Phase-1 only indexes text-like files. PDF/DOCX extraction will be added later.`
    );
  }

  async function fetchServerReply(nextMsgs) {
    try {
      const payload = {
        caseId: caseId || null,
        mode: "hybrid",
        testerId: testerId || "",
        messages: toApiMessages(nextMsgs),
        caseSnapshot: buildCaseSnapshot(selectedCase),
        documents: buildDocumentInventory(docs)
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Even if !ok, server often returns a useful JSON reply; parse it.
      const data = await res.json().catch(() => null);
      const content = data?.reply?.content;

      if (!res.ok) {
        addMessage("assistant", data?.message || data?.error || `Server error (${res.status}).`);
        return;
      }

      if (!content) {
        addMessage("assistant", "No response received (empty).");
        return;
      }

      addMessage("assistant", content);
    } catch (e) {
      addMessage("assistant", `Network error: ${String(e?.message || e)}`);
    }
  }

  async function onSend() {
    const text = String(input || "").trim();
    if (!text) return;

    if (text.length > MAX_INPUT_CHARS) {
      pushBanner(`Message too long (max ${MAX_INPUT_CHARS} chars).`);
      return;
    }

    setInput("");

    const next = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", ts: nowTs(), text }
    ];

    setMessages(next);
    setServerPending(true);

    await fetchServerReply(next);

    setServerPending(false);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  // Minimal UI
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#fff"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 12 }}>ASK THOXIE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#666" }}>
            RAG: {ragStatus.synced ? `Synced (${ragStatus.last})` : "Not synced"}
          </div>
          <button
            onClick={syncDocsToServer}
            style={{
              fontSize: 11,
              borderRadius: 10,
              padding: "7px 10px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#f6f6f6",
              cursor: "pointer",
              fontWeight: 700
            }}
            title="Index documents (Phase-1: text-like only)"
          >
            Sync Docs
          </button>
          <button
            onClick={onClose}
            style={{
              fontSize: 11,
              borderRadius: 10,
              padding: "7px 10px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Banner */}
      {banner ? (
        <div style={{ padding: "8px 12px", fontSize: 12, background: "#fff7d6", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          {banner}
        </div>
      ) : null}

      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ margin: "8px 0", textAlign: m.role === "user" ? "right" : "left" }}>
            <div
              style={{
                display: "inline-block",
                maxWidth: "92%",
                padding: "10px 12px",
                borderRadius: 12,
                background: m.role === "user" ? "#111" : "#f2f2f2",
                color: m.role === "user" ? "#fff" : "#111",
                whiteSpace: "pre-wrap",
                lineHeight: 1.35
              }}
            >
              {m.text}
            </div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
              {new Date(m.ts).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", padding: 10, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about CA small claims…"
          style={{
            flex: 1,
            resize: "none",
            borderRadius: 10,
            padding: "10px 12px",
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
            minHeight: 44
          }}
          rows={1}
        />
        <button
          onClick={onSend}
          disabled={serverPending}
          style={{
            borderRadius: 10,
            padding: "10px 12px",
            border: "none",
            background: "#111",
            color: "#fff",
            fontWeight: 800,
            cursor: serverPending ? "not-allowed" : "pointer",
            opacity: serverPending ? 0.6 : 1
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}





