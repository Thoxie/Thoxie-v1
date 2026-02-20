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

function prettySize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
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

  function pushBanner(msg, ms = 2600) {
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
        pushBanner("RAG index is empty (server restarted). Click “Sync Docs” again.", 3200);
      }
    } catch {
      if (hadPriorSync && reason === "case-change") {
        pushBanner("RAG status unavailable. If snippets seem missing, click “Sync Docs”.", 3200);
      }
    }
  }

  // Sync docs from IndexedDB -> server index (Phase-1: text-like only)
  async function syncDocsToServer() {
    if (!caseId) {
      pushBanner("Select a case first.");
      return;
    }

    if (serverPending) {
      pushBanner("Please wait — request in progress.");
      return;
    }

    setServerPending(true);

    try {
      const rows = await DocumentRepository.listByCaseId(caseId);

      if (!rows || rows.length === 0) {
        pushBanner("No documents found for this case. Upload a document first.");
        setServerPending(false);
        return;
      }

      // Phase-1 constraints (product messaging, not technical):
      // - We only reliably index text-like docs right now (or docs that already have extractedText).
      // - Large files are skipped to avoid server rejections.
      const MAX_DOCS = 12;
      const MAX_BYTES_PER_DOC = 1_500_000; // ~1.5 MB
      const payloadDocs = [];
      const skipped = [];

      const slice = rows.slice(0, MAX_DOCS);

      for (const d of slice) {
        const docId = d.id || d.docId || "";
        const name = d.name || d.filename || d.originalName || "(unnamed)";
        const mimeType = d.mimeType || d.kind || d.type || "";

        const extractedText = typeof d.extractedText === "string" ? d.extractedText.trim() : "";

        // Best case: already extracted text
        if (extractedText) {
          payloadDocs.push({
            docId,
            name,
            mimeType,
            text: extractedText
          });
          continue;
        }

        // Next best: small blob (Phase-1)
        if (d.blob) {
          const res = await blobToBase64(d.blob, MAX_BYTES_PER_DOC);
          if (res && res.ok && res.base64) {
            payloadDocs.push({
              docId,
              name,
              mimeType,
              base64: res.base64
            });
          } else {
            skipped.push({
              name,
              reason: res?.reason === "too_large" ? `Too large (${prettySize(d.blob.size)}).` : "Unsupported content."
            });
          }
          continue;
        }

        skipped.push({ name, reason: "No indexable text (Phase-1)." });
      }

      if (payloadDocs.length === 0) {
        const why =
          skipped.length > 0
            ? `Nothing to sync. ${skipped.length} file(s) skipped (Phase-1 limitations).`
            : "Nothing to sync.";
        pushBanner(why, 3600);

        // Put a helpful note in chat so it’s not “mysterious”
        addMessage(
          "assistant",
          [
            "Sync Docs did not run because there were no indexable documents in Phase-1.",
            "",
            "What you can do now:",
            "• Upload a text-based document (TXT) OR a document that has extracted text.",
            "• Or wait for the next phase where PDF/DOCX extraction is supported.",
            "",
            skipped.length ? "Skipped files:" : null,
            ...skipped.slice(0, 12).map((s) => `• ${s.name} — ${s.reason}`)
          ]
            .filter(Boolean)
            .join("\n")
        );

        setServerPending(false);
        return;
      }

      pushBanner(`Syncing ${payloadDocs.length} document(s)…`, 2000);

      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, documents: payloadDocs })
      });

      // Parse server response (even on error) so we can show the real reason.
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const status = res.status;
        const serverMsg = data?.error || data?.message || `Server rejected the request (${status}).`;

        // Make the message understandable and actionable.
        let friendly = serverMsg;

        if (status === 413) {
          friendly =
            "Sync failed because the upload was too large for Phase-1. Try fewer docs or smaller docs, then Sync again.";
        } else if (status === 400) {
          friendly =
            serverMsg ||
            "Sync failed due to invalid input. Make sure a case is selected and at least one document is uploaded.";
        } else if (status >= 500) {
          friendly = "Sync failed due to a temporary server issue. Try again in a minute.";
        }

        pushBanner(friendly, 4200);

        addMessage(
          "assistant",
          [
            "Sync Docs failed.",
            `Reason: ${friendly}`,
            "",
            "Quick fixes:",
            "• Confirm a case is selected.",
            "• Upload a small text-based document first (TXT).",
            "• Try syncing 1–2 docs (Phase-1).",
            "",
            `Server status: ${status}`
          ].join("\n")
        );

        setServerPending(false);
        return;
      }

      const indexed = Array.isArray(data?.indexed) ? data.indexed : [];
      const okCount = indexed.filter((x) => x && x.ok).length;
      const failCount = indexed.length - okCount;

      setLocalRagMeta(caseId, {
        lastSyncedAt: Date.now(),
        indexedOk: okCount,
        total: indexed.length
      });

      // Refresh status (handles cold start / empty index cases)
      await refreshRagStatusFromServer("post-sync");

      // Product-grade report
      const lines = [];
      lines.push(`Sync complete for this case.`);
      lines.push(`Indexed: ${okCount}/${indexed.length}`);

      if (failCount > 0) {
        lines.push("");
        lines.push("Some files were not indexed in Phase-1:");
        for (const r of indexed.filter((x) => !x.ok).slice(0, 10)) {
          lines.push(`• ${(r?.name || "(unnamed)")} — ${(r?.note || "No indexable text yet.")}`);
        }
      }

      if (skipped.length > 0) {
        lines.push("");
        lines.push("Skipped before upload (Phase-1 limitations):");
        for (const s of skipped.slice(0, 10)) {
          lines.push(`• ${s.name} — ${s.reason}`);
        }
      }

      addMessage("assistant", lines.join("\n"));
      pushBanner(`Sync complete: ${okCount} indexed.`, 3200);
    } catch (e) {
      pushBanner("Sync failed due to a network error. Please try again.", 4200);
      addMessage("assistant", `Sync Docs failed (network). ${String(e?.message || e)}`);
    } finally {
      setServerPending(false);
    }
  }

  async function fetchServerReply(nextMsgs) {
    try {
      const guidanceSummary = summarizeCaseForGuidance(selectedCase);

      const payload = {
        mode: "hybrid",
        testerId: testerId || "",
        caseId: caseId || null,
        caseSnapshot: buildCaseSnapshot(selectedCase),
        docs: buildDocumentInventory(docs),
        guidanceSummary,
        messages: toApiMessages(nextMsgs)
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || data?.error || `Server error (${res.status}).`;
        addMessage("assistant", msg);
        return;
      }

      const content = data?.reply?.content;
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

  const buttonBase = {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer"
  };

  const disabledStyle = {
    opacity: 0.6,
    cursor: "not-allowed"
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 12px 0 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <button
            onClick={syncDocsToServer}
            style={{ ...buttonBase, ...(serverPending ? disabledStyle : null) }}
            title="Index text-like documents for retrieval"
            disabled={serverPending}
          >
            {serverPending ? "Working…" : "Sync Docs"}
          </button>

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
                  {(c.jurisdiction?.county || "Unknown County")} — {c.role === "defendant" ? "Def" : "Pl"} —{" "}
                  {(c.category || "Case")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            borderRadius: "12px",
            background: "#fafafa",
            border: "1px solid #eee"
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: "6px" }}>Disclaimer</div>
          <div style={{ fontSize: "13px", color: "#444", lineHeight: 1.55 }}>
            Decision-support only — not legal advice. For evidence-based answers, click <b>Sync Docs</b>.
            <br />
            Tip: include county, your role (plaintiff/defendant), amount claimed, and key facts.
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
            RAG status: {ragStatus.synced ? `Synced (${ragStatus.last})` : "Not synced"}
          </div>
        </div>

        {banner ? (
          <div
            style={{
              marginTop: "10px",
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
            marginTop: "12px",
            height: "min(380px, 44vh)",
            overflow: "auto",
            border: "1px solid #eee",
            borderRadius: "12px",
            padding: "12px",
            background: "#fff"
          }}
        >
          <div style={{ maxWidth: "820px", margin: "0 auto" }}>
            {messages.map((m) => (
              <div key={m.id} style={{ margin: "10px 0", textAlign: m.role === "user" ? "right" : "left" }}>
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
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                  {new Date(m.ts).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "auto", borderTop: "1px solid #eee", padding: 12, display: "flex", gap: 10, background: "#fff" }}>
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



