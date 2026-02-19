// Path: /src/components/AIChatbox.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaseRepository } from "../../app/_repository/caseRepository";
import { DocumentRepository } from "../../app/_repository/documentRepository";

function storageKey(caseId) {
  return `thoxie.aiChat.v1.${caseId || "no-case"}`;
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

  // NEW: RAG sync state
  const [ragStatus, setRagStatus] = useState({ synced: false, last: "" });

  const listRef = useRef(null);

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

  function toApiMessages(msgs) {
    const out = [];
    for (const m of msgs || []) {
      if (!m || typeof m !== "object") continue;
      const role = m.role === "user" ? "user" : "assistant";
      const text = String(m.text || "").trim();
      if (!text) continue;
      out.push({ role, content: text });
    }
    return out.slice(-50);
  }

  function buildCaseSnapshot(c) {
    if (!c || typeof c !== "object") return null;
    const j = c.jurisdiction || {};
    return {
      role: c.role || "",
      category: c.category || "",
      caseNumber: c.caseNumber || "",
      hearingDate: c.hearingDate || "",
      hearingTime: c.hearingTime || "",
      amountClaimed: c.amountClaimed || "",
      factsSummary: c.factsSummary || c.summary || "",
      jurisdiction: {
        county: j.county || "",
        courtName: j.courtName || ""
      }
    };
  }

  function buildDocumentInventory(list) {
    const rows = Array.isArray(list) ? list : [];
    return rows.slice(0, 50).map((d) => {
      const obj = d && typeof d === "object" ? d : {};
      return {
        docId: obj.id || obj.docId || "",
        name: obj.name || obj.filename || obj.originalName || "",
        mimeType: obj.mimeType || obj.kind || obj.type || "",
        pages: typeof obj.pages === "number" ? obj.pages : undefined,
        uploadedAt: obj.uploadedAt || obj.createdAt || obj.updatedAt || ""
      };
    });
  }

  // NEW: Sync docs from IndexedDB -> server index (Phase-1: text-like base64 only)
  async function syncDocsToServer() {
    if (!caseId) {
      pushBanner("Select a case first.");
      return;
    }

    pushBanner("Syncing docs to server index…");

    // Pull full doc records so we can access blob/extractedText if present
    const rows = await DocumentRepository.listByCaseId(caseId);
    const payloadDocs = [];

    // Safety cap: only send first 12 docs
    const maxDocs = 12;
    const maxBytes = 1_500_000;

    for (const d of (rows || []).slice(0, maxDocs)) {
      const docId = d.id || d.docId || "";
      const name = d.name || d.filename || d.originalName || "(unnamed)";
      const mimeType = d.mimeType || d.kind || d.type || "";

      // Prefer already extracted text if any
      const extractedText = typeof d.extractedText === "string" ? d.extractedText : "";

      // If no extracted text, try base64 for small text-like files
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

    setRagStatus({ synced: true, last: new Date().toLocaleString() });
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
        messages: toApiMessages(nextMsgs),
        caseSnapshot: buildCaseSnapshot(selectedCase),
        documents: buildDocumentInventory(docs)
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data?.reply?.content;
      if (typeof content !== "string" || !content.trim()) return null;
      return content.trim();
    } catch {
      return null;
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;

    const userMsg = { id: crypto.randomUUID(), role: "user", ts: nowTs(), text };
    const nextMsgs = [...messages, userMsg];

    setMessages(nextMsgs);
    setInput("");

    setServerPending(true);
    const serverText = await fetchServerReply(nextMsgs);
    setServerPending(false);

    if (serverText) addMessage("assistant", serverText);
    else addMessage("assistant", "No server reply received.");
  }

  const wrap = {
    border: "1px solid #e6e6e6",
    borderRadius: "14px",
    background: "#fff",
    width: "100%",
    maxWidth: "100%",
    padding: "14px",
    fontFamily: "system-ui, sans-serif"
  };

  const small = { fontSize: "12px", color: "#666" };

  return (
    <div style={wrap}>
      {banner ? (
        <div
          style={{
            marginBottom: "10px",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "#e8f5e9",
            border: "1px solid #c8e6c9",
            fontWeight: 800
          }}
        >
          {banner}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: "16px" }}>AI Assistant</div>
          <div style={small}>
            v1 scaffold + readiness + Phase-1 RAG retrieval.
            {serverPending ? " (Server thinking…)" : ""}
          </div>
          <div style={small}>RAG last sync: {ragStatus.synced ? ragStatus.last : "(not synced)"}</div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
          {typeof onClose === "function" ? (
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: "12px",
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 900,
                height: "40px"
              }}
              aria-label="Close chat"
              title="Close (Esc)"
            >
              Close
            </button>
          ) : null}

          <button
            type="button"
            onClick={syncDocsToServer}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              borderRadius: "12px",
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 900,
              height: "40px"
            }}
            title="Index text-like documents for retrieval"
          >
            Sync Docs
          </button>

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
      </div>

      <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "12px", background: "#fafafa", border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, marginBottom: "6px" }}>Disclaimer</div>
        <div style={{ fontSize: "13px", color: "#444" }}>
          Decision-support only — not legal advice. For evidence-based answers, click <b>Sync Docs</b>.
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          marginTop: "12px",
          height: "min(340px, 40vh)",
          overflow: "auto",
          border: "1px solid #eee",
          borderRadius: "12px",
          padding: "10px",
          background: "#fff"
        }}
      >
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: "10px" }}>
            <div style={{ fontWeight: 900, fontSize: "12px", color: m.role === "user" ? "#222" : "#444" }}>
              {m.role === "user" ? "You" : "Assistant"}{" "}
              <span style={{ fontWeight: 600, color: "#777" }}>— {new Date(m.ts).toLocaleString()}</span>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "#222", marginTop: "4px" }}>{m.text}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "what’s missing", or ask a question after syncing docs…'
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          style={{
            flex: 1,
            padding: "12px 12px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            fontSize: "14px"
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          style={{
            border: "1px solid #ddd",
            background: "#111",
            color: "#fff",
            borderRadius: "12px",
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          Send
        </button>
      </div>

      <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm("Clear chat history for this case (in this browser)?");
            if (!ok) return;
            localStorage.removeItem(storageKey(caseId));
            setMessages([
              {
                id: crypto.randomUUID(),
                role: "assistant",
                ts: nowTs(),
                text: "Chat cleared. Tip: click “Sync Docs” for evidence retrieval."
              }
            ]);
            pushBanner("Chat cleared.");
          }}
          style={{
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: "12px",
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          Clear Chat
        </button>

        <button
          type="button"
          onClick={() => {
            addMessage("assistant", `Case snapshot:\n\n${summarizeCaseForGuidance(selectedCase)}`);
            pushBanner("Snapshot added.");
          }}
          style={{
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: "12px",
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          Insert Snapshot
        </button>
      </div>
    </div>
  );
}



