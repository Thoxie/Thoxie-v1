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

  // Keep current behavior (Buffer usage). Do not change.
  const buf = Buffer.from(ab);
  return { ok: true, base64: buf.toString("base64"), bytes };
}

function initialAssistantMessage() {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    ts: nowTs(),
    text:
      "AI Assistant is active. Phase-1 RAG is available: click “Sync Docs” to index text-like documents for evidence-based retrieval."
  };
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
      localStorage.setItem(betaKey(), testerId || "");
    } catch {
      // ignore
    }
  }, [testerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof onClose !== "function") return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(caseId));
    const saved = raw ? safeJsonParse(raw, []) : [];
    if (Array.isArray(saved) && saved.length) {
      setMessages(saved);
    } else {
      setMessages([initialAssistantMessage()]);
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

  useEffect(() => {
    // Auto-resize textarea (UI only)
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  function pushBanner(msg, ms = 3500) {
    setBanner(msg);
    window.clearTimeout(pushBanner._t);
    pushBanner._t = window.setTimeout(() => setBanner(""), ms);
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

  function summarizeCaseForGuidance(c) {
    if (!c) return "No case selected yet.";
    const j = c.jurisdiction || {};
    const caseNo = (c.caseNumber || "").trim();
    const hearing = (c.hearingDate || "").trim()
      ? `${c.hearingDate}${(c.hearingTime || "").trim() ? ` at ${c.hearingTime}` : ""}`
      : "";

    return [
      `Role: ${c.role === "defendant" ? "Defendant" : "Plaintiff"}`,
      `Category: ${c.category || "(not set)"}`,
      `County/Court: ${(j.county || "(not set)")} — ${(j.courtName || "(not set)")}`,
      `Case #: ${caseNo || "(not set)"}`,
      `Hearing: ${hearing || "(not set)"}`,
      `Documents uploaded: ${docs.length}`,
      `RAG indexed: ${ragStatus.synced ? "Yes" : "No"}`
    ].join("\n");
  }

  const disabledStyle = { opacity: 0.7, cursor: "not-allowed" };

  const buttonPrimary = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer"
  };

  const buttonSecondary = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer"
  };

  async function refreshRagStatusFromServer(reason) {
    try {
      if (!caseId) return;
      const r = await fetch(
        `/api/rag/status?caseId=${encodeURIComponent(caseId)}&reason=${encodeURIComponent(reason || "")}`,
        { method: "GET" }
      );
      const j = await r.json();
      if (j && typeof j.synced === "boolean") {
        setRagStatus({ synced: !!j.synced, last: (j.last || "").trim() });
      }
    } catch {
      // ignore
    }
  }

  async function syncDocsToServer() {
    if (!caseId) {
      pushBanner("Select a case first.");
      return;
    }

    const localMeta = getLocalRagMeta(caseId);
    const docsForCase = await DocumentRepository.listByCaseId(caseId);

    if (!docsForCase || docsForCase.length === 0) {
      pushBanner("No documents found for this case. Upload documents first.");
      return;
    }

    setServerPending(true);
    try {
      pushBanner("Preparing documents for indexing…", 4000);

      const maxBytes = 2_000_000; // 2MB per file cap for safety (UI guardrail only)
      const payloadDocs = [];
      let tooLargeCount = 0;

      for (const d of docsForCase) {
        const blob = await DocumentRepository.getBlobById(d.id);
        const asB64 = await blobToBase64(blob, maxBytes);

        if (!asB64 || asB64.ok === false) {
          tooLargeCount += 1;
          continue;
        }

        payloadDocs.push({
          id: d.id,
          name: d.name,
          mime: d.mime || "",
          size: asB64.bytes,
          base64: asB64.base64
        });
      }

      if (payloadDocs.length === 0) {
        pushBanner("All documents were too large to sync. Try smaller PDFs or text files.");
        return;
      }

      const body = {
        caseId,
        testerId: testerId || "",
        caseSummary: summarizeCaseForGuidance(selectedCase),
        docs: payloadDocs,
        clientMeta: {
          at: nowTs(),
          localMeta: localMeta || null,
          skippedTooLarge: tooLargeCount
        }
      };

      const r = await fetch("/api/rag/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        pushBanner(`Sync failed (${r.status}).`);
        return;
      }

      const j = await r.json();
      setLocalRagMeta(caseId, { at: nowTs(), result: j || {} });

      pushBanner(
        `Synced ${payloadDocs.length} doc(s). ${tooLargeCount ? `${tooLargeCount} skipped (too large).` : ""}`,
        4500
      );
      await refreshRagStatusFromServer("sync");
    } catch {
      pushBanner("Sync failed (network error).");
    } finally {
      setServerPending(false);
    }
  }

  async function clearChatOnly() {
    setMessages([initialAssistantMessage()]);
    pushBanner("Chat cleared for this case.");
  }

  async function onSend() {
    const text = String(input || "").trim();
    if (!text) return;

    if (text.length > MAX_INPUT_CHARS) {
      pushBanner(`Message too long. Limit is ${MAX_INPUT_CHARS} characters.`);
      return;
    }

    if (!caseId) {
      pushBanner("Select a case first.");
      return;
    }

    setInput("");
    addMessage("user", text);

    // Server call unchanged
    setServerPending(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          testerId: testerId || "",
          messages: [...messages, { role: "user", text, ts: nowTs() }],
          caseSummary: summarizeCaseForGuidance(selectedCase)
        })
      });

      if (!r.ok) {
        addMessage("assistant", `Error (${r.status}).`);
        return;
      }

      const j = await r.json();
      addMessage("assistant", j?.text || "No response.");
    } catch {
      addMessage("assistant", "Network error.");
    } finally {
      setServerPending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Top + messages region should flex and shrink so the input is always reachable */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <button
              onClick={syncDocsToServer}
              style={{ ...buttonPrimary, ...(serverPending ? disabledStyle : null) }}
              title="Index text-like documents for retrieval"
              disabled={serverPending}
            >
              {serverPending ? "Working…" : "Sync Docs"}
            </button>

            <button
              onClick={clearChatOnly}
              style={{ ...buttonSecondary, ...(serverPending ? disabledStyle : null) }}
              title="Clear chat history for this case only"
              disabled={serverPending}
            >
              Clear Chat
            </button>
          </div>

          <div style={{ minWidth: "240px" }}>
            <div style={{ fontWeight: 900, fontSize: "12px" }}>Beta ID</div>
            <input
              value={testerId}
              onChange={(e) => setTesterId(e.target.value)}
              placeholder="example@email.com"
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: "14px"
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
                fontSize: "14px"
              }}
              disabled={serverPending}
            >
              <option value="">Select a case…</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.jurisdiction?.county || "Unknown County")} — {c.role === "defendant" ? "Def" : "Pl"} —{" "}
                  {(c.category || "Case")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner */}
        {banner ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "12px",
              background: "#fff7d6",
              border: "1px solid #eee",
              fontSize: "13px"
            }}
          >
            {banner}
          </div>
        ) : null}

        {/* Messages */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            border: "1px solid #eee",
            borderRadius: "12px",
            padding: "12px",
            background: "#fff"
          }}
        >
          <div style={{ maxWidth: "920px", margin: "0 auto" }}>
            {messages.map((m) => (
              <div key={m.id} style={{ margin: "10px 0", textAlign: m.role === "user" ? "right" : "left" }}>
                <div
                  style={{
                    display: "inline-block",
                    maxWidth: "92%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: m.role === "user" ? "#111" : "#f2f2f2",
                    color: m.role === "user" ? "#fff" : "#111",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    fontSize: 14
                  }}
                >
                  {m.text}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                  {new Date(m.ts).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input row */}
      <div
        style={{
          borderTop: "1px solid #eee",
          padding: 12,
          display: "flex",
          gap: 10,
          background: "#fff"
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Draft your question or paste facts here…"
          style={{
            flex: 1,
            resize: "none",
            borderRadius: 12,
            padding: "12px 12px",
            border: "1px solid #ddd",
            outline: "none",
            minHeight: 56,
            fontSize: 14,
            lineHeight: 1.55
          }}
          rows={1}
          disabled={serverPending}
        />
        <button
          onClick={onSend}
          disabled={serverPending}
          style={{
            padding: "12px 16px",
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

