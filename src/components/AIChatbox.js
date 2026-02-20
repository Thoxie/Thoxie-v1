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

  // Keep repo behavior (Buffer usage). Do not change.
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

  const [testerId, setTesterId] = useState("");
  const [ragStatus, setRagStatus] = useState({ synced: false, last: "" });

  const listRef = useRef(null);
  const textareaRef = useRef(null);

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
    try {
      const v = localStorage.getItem(betaKey());
      if (v && !testerId) setTesterId(String(v || ""));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (testerId) localStorage.setItem(betaKey(), testerId);
    } catch {
      // ignore
    }
  }, [testerId]);

  useEffect(() => {
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
      if (hadPriorSync && reason === "case-change") {
        pushBanner("RAG status unavailable. If snippets seem missing, click “Sync Docs”.");
      }
    }
  }

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

    setLocalRagMeta(caseId, {
      lastSyncedAt: Date.now(),
      indexedOk: okCount,
      total: (data?.indexed || []).length
    });

    setRagStatus({ synced: true, last: new Date().toLocaleString() });

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

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "14px",
          alignItems: "flex-end",
          padding: "14px",
          borderBottom: "1px solid #eee",
          background: "#fff",
          flexWrap: "wrap"
        }}
      >
        <div style={{ minWidth: "240px" }}>
          <div style={{ fontWeight: 900, fontSize: "12px" }}>Tester ID</div>
          <input
            value={testerId}
            onChange={(e) => setTesterId(e.target.value)}
            placeholder="e.g., paul"
            style={{
              width: "100%",
              marginTop: "6px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: "13px"
            }}
            disabled={serverPending}
          />
        </div>

        <div style={{ minWidth: "240px" }}>
          <div style={{ fontWeight: 900, fontSize: "12px" }}>Case</div>
          <select
            value={caseId}
            onChange={(e) => {
              setCaseId(e.target.value);
              setRagStatus({ synced: false, last: "" });
              pushBanner("Case selection saved.");
            }}
            style={{
              width: "100%",
              marginTop: "6px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: "13px"
            }}
            disabled={serverPending}
          >
            <option value="">Select a case…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.caseLabel || c.caseId || c.id || "Case").toString()}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={syncDocsToServer}
            disabled={serverPending}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: serverPending ? "not-allowed" : "pointer"
            }}
            title="Index documents (Phase-1: text-like only)"
          >
            Sync Docs
          </button>

          <div style={{ fontSize: 12, color: "#666" }}>
            RAG: {ragStatus.synced ? `Synced (${ragStatus.last})` : "Not synced"}
          </div>

          <button
            onClick={onClose}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Banner */}
      {banner ? (
        <div style={{ padding: "10px 14px", fontSize: 12, background: "#fff7d6", borderBottom: "1px solid #eee" }}>
          {banner}
        </div>
      ) : null}

      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflow: "auto", padding: 14, background: "#fafafa" }}>
        {messages.map((m) => (
          <div key={m.id} style={{ margin: "10px 0", textAlign: m.role === "user" ? "right" : "left" }}>
            <div
              style={{
                display: "inline-block",
                maxWidth: "92%",
                padding: "10px 12px",
                borderRadius: 12,
                background: m.role === "user" ? "#111" : "#fff",
                color: m.role === "user" ? "#fff" : "#111",
                border: m.role === "user" ? "1px solid #111" : "1px solid #e6e6e6",
                whiteSpace: "pre-wrap",
                lineHeight: 1.35
              }}
            >
              {m.text}
            </div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
              {new Date(m.ts).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #eee", padding: 12, display: "flex", gap: 10, background: "#fff" }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about CA small claims…"
          style={{
            flex: 1,
            resize: "none",
            borderRadius: 12,
            padding: "10px 12px",
            border: "1px solid #ddd",
            outline: "none",
            minHeight: 44,
            fontSize: 13
          }}
          rows={1}
          disabled={serverPending}
        />
        <button
          onClick={onSend}
          disabled={serverPending}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            fontWeight: 900,
            cursor: serverPending ? "not-allowed" : "pointer",
            opacity: serverPending ? 0.7 : 1
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}




