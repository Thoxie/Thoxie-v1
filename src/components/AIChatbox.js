// Path: /src/components/AIChatbox.js
"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { DocumentRepository } from "../../app/_repository/documentRepository";

/**
 * AIChatbox — formatting + response parsing hardening
 *
 * What this change does:
 * - Makes assistant replies human-readable by formatting headings/bullets/markdown into clean text.
 * - Preserves line breaks (pre-wrap) so spacing is visible.
 * - Accepts multiple server response shapes:
 *     { reply: { role, content } }  (preferred)
 *     { assistant: "..." }         (legacy)
 * - Exposes dock header methods used by GlobalChatboxDock:
 *     chatRef.current.syncDocs()
 *     chatRef.current.clearChat()
 *
 * What this change does NOT do:
 * - No changes to /api/chat
 * - No prompt changes
 * - No readiness changes
 * - No storage model changes
 */

const MAX_INPUT_CHARS = 6000;

function storageKey(caseId) {
  return `thoxie.aiChat.v1.${caseId || "no-case"}`;
}

function nowTs() {
  return new Date().toISOString();
}

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function initialAssistantMessage() {
  return {
    role: "assistant",
    content:
      "Hi — I’m THOXIE. Tell me what you’re trying to do in California small claims and I’ll help you structure it step-by-step.",
    at: nowTs()
  };
}

async function blobToBase64(blob, maxBytes) {
  if (!blob) return { ok: false, reason: "no_blob" };
  const size = Number(blob.size || 0);
  if (size > maxBytes) return { ok: false, reason: "too_large", bytes: size };

  const arrBuf = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrBuf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return { ok: true, base64, bytes: size };
}

function getLocalRagMeta(caseId) {
  const k = `thoxie.ragMeta.v1.${caseId || "no-case"}`;
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
  return raw ? safeJsonParse(raw, null) : null;
}

function setLocalRagMeta(caseId, value) {
  const k = `thoxie.ragMeta.v1.${caseId || "no-case"}`;
  try {
    window.localStorage.setItem(k, JSON.stringify(value || null));
  } catch {
    // ignore
  }
}

function extractAssistantText(j) {
  // Preferred modern shape:
  // { ok: true, reply: { role:"assistant", content:"..." } }
  const fromReply = typeof j?.reply?.content === "string" ? j.reply.content.trim() : "";
  if (fromReply) return fromReply;

  // Legacy shapes:
  const legacy = typeof j?.assistant === "string" ? j.assistant.trim() : "";
  if (legacy) return legacy;

  // Sometimes a server may return { message: "..." }
  const msg = typeof j?.message === "string" ? j.message.trim() : "";
  if (msg) return msg;

  return "";
}

function formatAssistantText(raw) {
  let t = String(raw || "");
  if (!t.trim()) return "";

  // Normalize newlines early
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Remove heavy markdown emphasis **like this**
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");

  // Convert markdown headings to readable section titles
  // ### Title -> Title:\n
  t = t.replace(/^\s*###\s+/gm, "");
  // If the model uses "Title: ..." already, keep it.
  // Add spacing before common section starters
  const sectionStarters = [
    "Short Answer",
    "Key Issues",
    "What Must Be Proven",
    "Evidence Checklist",
    "Filing/Next Steps",
    "Next Steps",
    "Risks/Limits",
    "Follow-Up Questions",
    "What you need",
    "What This Means",
    "What Information You’ll Need",
    "What Information You'll Need"
  ];

  for (const s of sectionStarters) {
    const re = new RegExp(`(^|\\n)\\s*${s}\\s*:?\\s*(\\n|$)`, "g");
    t = t.replace(re, (m, p1) => `${p1}\n\n${s}:\n`);
  }

  // Convert dash bullets to dot bullets
  t = t.replace(/^\s*-\s+/gm, "• ");

  // Convert asterisks bullets "* " to dot bullets, but avoid multiplication-looking cases
  t = t.replace(/^\s*\*\s+/gm, "• ");

  // Normalize numbered lists: ensure a blank line before them when glued to text
  t = t.replace(/([^\n])\n(\d+\.\s)/g, "$1\n\n$2");

  // Remove excessive spaces
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{4,}/g, "\n\n\n");

  // Improve readability when the model runs everything into one line
  // Add line breaks before bullet blocks if preceded by text
  t = t.replace(/([^\n])\n• /g, "$1\n\n• ");

  // Trim edges
  t = t.trim();

  return t;
}

export const AIChatbox = forwardRef(function AIChatbox(
  {
    caseId,
    caseType,
    testerId,
    betaGateStatus,
    domainGateStatus,
    onBanner,
    onStatus
  },
  ref
) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverPending, setServerPending] = useState(false);

  const abortRef = useRef(null);

  const pushBanner = (text, ms = 3500) => {
    if (typeof onBanner === "function") onBanner(text, ms);
  };

  const pushStatus = (obj) => {
    if (typeof onStatus === "function") onStatus(obj);
  };

  // Load stored chat (case-scoped)
  useEffect(() => {
    const raw =
      typeof window !== "undefined" ? window.localStorage.getItem(storageKey(caseId)) : null;
    const loaded = raw ? safeJsonParse(raw, []) : [];
    setMessages(Array.isArray(loaded) ? loaded : []);
  }, [caseId]);

  // Ensure at least one assistant message exists
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setMessages([initialAssistantMessage()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Persist chat (case-scoped)
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(caseId), JSON.stringify(messages || []));
    } catch {
      // ignore
    }
  }, [caseId, messages]);

  async function refreshRagStatusFromServer(source = "unknown") {
    try {
      if (!caseId) return;
      const r = await fetch(`/api/rag/status?caseId=${encodeURIComponent(caseId)}`);
      const j = await r.json().catch(() => null);
      if (r.ok && j) {
        pushStatus({ type: "ragStatus", source, synced: !!j.synced, last: (j.last || "").trim() });
      }
    } catch {}
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

      const maxBytes = 2_000_000;
      const payloadDocs = [];
      let tooLargeCount = 0;

      for (const d of docsForCase) {
        const stableId = d.docId || d.id;
        const blob = await DocumentRepository.getBlobById(stableId);
        const asB64 = await blobToBase64(blob, maxBytes);

        if (!asB64 || asB64.ok === false) {
          tooLargeCount += 1;
          continue;
        }

        payloadDocs.push({
          docId: stableId,
          id: stableId,
          name: d.name,
          filename: d.name,
          mimeType: d.mimeType || d.mime || "",
          size: asB64.bytes,
          text: typeof d.extractedText === "string" ? d.extractedText : "",
          base64: asB64.base64
        });
      }

      if (payloadDocs.length === 0) {
        pushBanner("All documents were too large to sync. Try smaller PDFs or text files.");
        return;
      }

      const body = {
        caseId,
        documents: payloadDocs,
        testerId: testerId || "",
        clientMeta: {
          at: nowTs(),
          localMeta: localMeta || null,
          skippedTooLarge: tooLargeCount
        }
      };

      const r = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const j = await r.json().catch(() => null);

      if (!r.ok) {
        const msg = j?.error || `Sync failed (${r.status}).`;
        pushBanner(msg);
        return;
      }

      setLocalRagMeta(caseId, { at: nowTs(), result: j || {} });

      pushBanner(
        `Synced ${payloadDocs.length} doc(s). ${
          tooLargeCount ? `${tooLargeCount} skipped (too large).` : ""
        }`,
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

  // Expose dock header controls
  useImperativeHandle(ref, () => ({
    syncDocs: syncDocsToServer,
    clearChat: clearChatOnly,
    clearChatOnly
  }));

  async function onSend() {
    const text = String(input || "").trim();
    if (!text) return;

    if (text.length > MAX_INPUT_CHARS) {
      pushBanner(`Message too long (max ${MAX_INPUT_CHARS} characters).`);
      return;
    }

    if (betaGateStatus?.blocked) {
      pushBanner("Beta access is restricted.");
      return;
    }

    if (domainGateStatus?.blocked) {
      pushBanner("This assistant is limited to supported topics.");
      return;
    }

    const next = [...(messages || []), { role: "user", content: text, at: nowTs() }];

    setMessages(next);
    setInput("");
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          caseType,
          testerId: testerId || "",
          messages: next.map((m) => ({ role: m.role, content: m.content }))
        }),
        signal: ctrl.signal
      });

      const j = await res.json().catch(() => null);
      const assistantRaw = extractAssistantText(j);
      const assistantText = formatAssistantText(assistantRaw);

      if (!res.ok) {
        if (assistantText) {
          setMessages((prev) => [
            ...(prev || []),
            { role: "assistant", content: assistantText, at: nowTs() }
          ]);
        } else {
          const msg = j?.error || `Request failed (${res.status}).`;
          pushBanner(msg);
        }
        setBusy(false);
        return;
      }

      if (assistantText) {
        setMessages((prev) => [
          ...(prev || []),
          { role: "assistant", content: assistantText, at: nowTs() }
        ]);
      } else {
        pushBanner("No response received.");
      }
    } catch (e) {
      pushBanner(`Network error: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const canSend = useMemo(() => {
    return !!String(input || "").trim() && !busy;
  }, [input, busy]);

  return (
    <div className="thoxie-aiChat">
      <div className="thoxie-aiChat__controls">
        <button onClick={syncDocsToServer} type="button" disabled={!caseId || serverPending}>
          {serverPending ? "Syncing…" : "Sync Docs"}
        </button>
        <button onClick={clearChatOnly} type="button" disabled={busy || serverPending}>
          Clear Chat
        </button>
      </div>

      <div className="thoxie-aiChat__messages">
        {(messages || []).map((m, idx) => (
          <div key={idx} className={`msg msg--${m.role}`}>
            <div className="msg__role">{m.role}</div>
            <div className="msg__content" style={{ whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="thoxie-aiChat__inputRow">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask THOXIE…"
          rows={3}
          disabled={busy || serverPending}
        />
        <button onClick={onSend} type="button" disabled={!canSend || serverPending}>
          {busy ? "Working…" : "Send"}
        </button>
      </div>
    </div>
  );
});

export default AIChatbox;
