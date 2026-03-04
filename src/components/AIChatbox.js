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

import { CaseRepository } from "../../app/_repository/caseRepository";
import { DocumentRepository } from "../../app/_repository/documentRepository";

/**
 * AIChatbox — Step 1: Case-aware AI context
 *
 * What this change does:
 * 1) Injects case context into /api/chat requests:
 *    - caseSnapshot (role/category/jurisdiction/amount/factsSummary/etc.)
 *    - documents metadata (name/type/uploadedAt + evidence tags + extractedText if present)
 *    This enables server buildChatContext() to produce THOXIE_CONTEXT_V1 and makes answers case-specific.
 *
 * 2) Keeps the improved human-readable formatting we just added.
 *
 * 3) Fixes Sync Docs robustness without touching DocumentRepository:
 *    - Retrieves blobs via DocumentRepository.get(docId).blob (no getBlobById dependency).
 *
 * What this change does NOT do:
 * - No server prompt changes
 * - No readiness engine changes
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

function s(v) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
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
  const fromReply = typeof j?.reply?.content === "string" ? j.reply.content.trim() : "";
  if (fromReply) return fromReply;

  const legacy = typeof j?.assistant === "string" ? j.assistant.trim() : "";
  if (legacy) return legacy;

  const msg = typeof j?.message === "string" ? j.message.trim() : "";
  if (msg) return msg;

  return "";
}

function formatAssistantText(raw) {
  let t = String(raw || "");
  if (!t.trim()) return "";

  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/\*\*(.+?)\*\*/g, "$1"); // remove bold markers

  // Turn ### headings into plain section headings
  t = t.replace(/^\s*###\s+/gm, "");

  // Encourage spacing for common sections
  const sectionStarters = [
    "Short Answer",
    "Key Issues",
    "What Must Be Proven",
    "Evidence Checklist",
    "Filing/Next Steps",
    "Next Steps",
    "Risks/Limits",
    "Follow-Up Questions",
    "What This Means",
    "What Information You’ll Need",
    "What Information You'll Need"
  ];

  for (const sec of sectionStarters) {
    const re = new RegExp(`(^|\\n)\\s*${sec}\\s*:?\\s*(\\n|$)`, "g");
    t = t.replace(re, (m, p1) => `${p1}\n\n${sec}:\n`);
  }

  // Convert markdown bullets to •
  t = t.replace(/^\s*-\s+/gm, "• ");
  t = t.replace(/^\s*\*\s+/gm, "• ");

  // Better spacing before numbered lists
  t = t.replace(/([^\n])\n(\d+\.\s)/g, "$1\n\n$2");

  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{4,}/g, "\n\n\n");
  t = t.replace(/([^\n])\n• /g, "$1\n\n• ");

  return t.trim();
}

/**
 * Build the caseSnapshot expected by server buildChatContext() + readiness engine.
 * We do NOT send blobs. We send safe metadata and extractedText (if present).
 */
async function buildCaseContext({ caseId }) {
  const id = s(caseId);
  if (!id) return { caseSnapshot: null, documents: [] };

  let c = null;
  try {
    c = CaseRepository.getById(id);
  } catch {
    c = null;
  }

  const caseSnapshot = c
    ? {
        role: s(c.role),
        category: s(c.category),
        jurisdiction: c.jurisdiction && typeof c.jurisdiction === "object" ? c.jurisdiction : {},
        caseNumber: s(c.caseNumber),
        hearingDate: s(c.hearingDate),
        hearingTime: s(c.hearingTime),
        amountClaimed: s(c?.claim?.amount ?? c?.damages ?? c?.amountClaimed ?? ""),
        factsSummary: s(c.facts || c.factsSummary || "")
      }
    : null;

  let docs = [];
  try {
    const rows = await DocumentRepository.listByCaseId(id);
    docs = Array.isArray(rows) ? rows : [];
  } catch {
    docs = [];
  }

  // Provide shape that server buildChatContext can render (name/type/uploadedAt)
  // Include evidence tags + extractedText for later use (still no blobs)
  const documents = docs.slice(0, 150).map((d) => ({
    docId: d.docId,
    caseId: d.caseId,
    name: d.name,
    filename: d.name,
    uploadedAt: d.uploadedAt,
    // buildChatContext uses kind/type; provide both.
    kind: s(d.docTypeLabel || d.docType || d.mimeType || ""),
    type: s(d.docTypeLabel || d.docType || d.mimeType || ""),
    mimeType: d.mimeType,
    size: d.size,
    exhibitDescription: s(d.exhibitDescription),
    evidenceCategory: s(d.evidenceCategory),
    evidenceSupports: Array.isArray(d.evidenceSupports) ? d.evidenceSupports : [],
    extractedText: s(d.extractedText)
  }));

  return { caseSnapshot, documents };
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
        let blob = null;

        // Robust blob retrieval without relying on a repo method that may not exist
        try {
          const full = await DocumentRepository.get(stableId);
          blob = full?.blob || null;
        } catch {
          blob = null;
        }

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
      // STEP 1: Build and inject case context into the chat request
      const { caseSnapshot, documents } = await buildCaseContext({ caseId });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          caseType,
          testerId: testerId || "",
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          caseSnapshot,
          documents
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
