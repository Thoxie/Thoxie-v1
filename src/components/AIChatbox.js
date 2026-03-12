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

import { createSpeechRecognizer, isSpeechRecognitionSupported } from "../utils/speechToText";

/**
 * UI-ONLY CHANGE (this batch):
 * - Wrap each message in a .msg__bubble so CSS can render user messages in a gray box.
 * - Keep all existing chat logic and API calls untouched.
 *
 * ADDITIONAL UI-ONLY CHANGE (this batch):
 * - Show a visible "Listening..." status next to the mic button while dictation is active.
 * - Do not change navigation, layout structure, fonts, or overall sizing.
 * - Do not change API behavior or speech-recognition behavior.
 */

const MAX_INPUT_CHARS = 6000;
const WAVE_BAR_COUNT = 20;
const WAVE_BASELINE = 10;
const WAVE_SMOOTHING = 0.34;
const WAVE_VARIANCE = [0.92, 1.08, 0.96, 1.14, 0.9, 1.12, 0.98, 1.1, 0.94, 1.06, 0.91, 1.13, 0.97, 1.09, 0.93, 1.15, 0.95, 1.07, 0.92, 1.11];

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
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");
  t = t.replace(/^\s*###\s+/gm, "");

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

  t = t.replace(/^\s*-\s+/gm, "• ");
  t = t.replace(/^\s*\*\s+/gm, "• ");
  t = t.replace(/([^\n])\n(\d+\.\s)/g, "$1\n\n$2");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{4,}/g, "\n\n\n");
  t = t.replace(/([^\n])\n• /g, "$1\n\n• ");

  return t.trim();
}

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

  const documents = docs.slice(0, 150).map((d) => ({
    docId: d.docId,
    caseId: d.caseId,
    name: d.name,
    filename: d.name,
    uploadedAt: d.uploadedAt,
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

function normalizeAppend(prev, text) {
  const a = String(prev || "");
  const b = String(text || "").trim();
  if (!b) return a;
  if (!a.trim()) return b;
  const needsSpace = !/\s$/.test(a);
  return needsSpace ? `${a} ${b}` : `${a}${b}`;
}

function createBaselineWaveform() {
  return Array.from({ length: WAVE_BAR_COUNT }, (_, idx) => {
    const offset = idx % 4 === 0 ? 3 : idx % 2 === 0 ? 1.5 : 0;
    return WAVE_BASELINE + offset;
  });
}

export const AIChatbox = forwardRef(function AIChatbox(
  {
    caseId,
    caseType,
    testerId,
    betaGateStatus,
    domainGateStatus,
    onBanner,
    onStatus,
    hideDockToolbar
  },
  ref
) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverPending, setServerPending] = useState(false);

  const [listening, setListening] = useState(false);
  const [showMicTip, setShowMicTip] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState(() => createBaselineWaveform());

  const abortRef = useRef(null);
  const textareaRef = useRef(null);
  const speechRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const waveformLevelsRef = useRef(createBaselineWaveform());

  const pushBanner = (text, ms = 3500) => {
    if (typeof onBanner === "function") onBanner(text, ms);
  };

  const pushStatus = (obj) => {
    if (typeof onStatus === "function") onStatus(obj);
  };

  useEffect(() => {
    waveformLevelsRef.current = waveformLevels;
  }, [waveformLevels]);

  useEffect(() => {
    const raw =
      typeof window !== "undefined" ? window.localStorage.getItem(storageKey(caseId)) : null;
    const loaded = raw ? safeJsonParse(raw, []) : [];
    setMessages(Array.isArray(loaded) ? loaded : []);
  }, [caseId]);

  useEffect(() => {
    if (!messages || messages.length === 0) {
      setMessages([initialAssistantMessage()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(caseId), JSON.stringify(messages || []));
    } catch {}
  }, [caseId, messages]);

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return;

    speechRef.current = createSpeechRecognizer({
      onFinalText: (t) => setInput((prev) => normalizeAppend(prev, t)),
      onError: (err) => {
        const name = String(err?.name || "");
        if (name === "not-allowed" || name === "service-not-allowed") {
          pushBanner("Microphone permission blocked in your browser settings.");
        } else if (name === "no-speech") {
          pushBanner("No speech detected. Try again.");
        } else {
          pushBanner(String(err?.message || "Voice input error."));
        }
        stopAudioVisualization();
        setListening(false);
      },
      onEnd: () => {
        stopAudioVisualization();
        setListening(false);
      }
    });

    return () => {
      try {
        speechRef.current?.abort?.();
      } catch {}
      speechRef.current = null;
      stopAudioVisualization();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAudioVisualization() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      sourceNodeRef.current?.disconnect?.();
    } catch {}
    sourceNodeRef.current = null;

    try {
      analyserRef.current?.disconnect?.();
    } catch {}
    analyserRef.current = null;

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    const baseline = createBaselineWaveform();
    waveformLevelsRef.current = baseline;
    setWaveformLevels(baseline);
  }

  async function startAudioVisualization() {
    stopAudioVisualization();

    const AudioContextCtor =
      typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;

    if (!AudioContextCtor || !navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Live microphone waveform is not supported in this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.fftSize);

    mediaStreamRef.current = stream;
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceNodeRef.current = source;

    const renderWaveform = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteTimeDomainData(dataArray);
      const previous = waveformLevelsRef.current || createBaselineWaveform();

      let sumSquares = 0;
      let peak = 0;
      const normalized = new Array(dataArray.length);

      for (let i = 0; i < dataArray.length; i++) {
        const centered = (dataArray[i] - 128) / 128;
        const abs = Math.abs(centered);
        normalized[i] = abs;
        sumSquares += centered * centered;
        if (abs > peak) peak = abs;
      }

      const rms = Math.sqrt(sumSquares / dataArray.length);
      const envelope = Math.min(1, rms * 12 + peak * 1.6);
      const bucketSize = Math.max(1, Math.floor(normalized.length / WAVE_BAR_COUNT));

      const nextLevels = Array.from({ length: WAVE_BAR_COUNT }, (_, idx) => {
        const start = idx * bucketSize;
        const end =
          idx === WAVE_BAR_COUNT - 1
            ? normalized.length
            : Math.min(normalized.length, start + bucketSize);

        let bucketSum = 0;
        let bucketPeak = 0;
        let count = 0;
        for (let i = start; i < end; i++) {
          const value = normalized[i];
          bucketSum += value;
          if (value > bucketPeak) bucketPeak = value;
          count += 1;
        }

        const bucketAvg = count > 0 ? bucketSum / count : 0;
        const bucketEnergy = Math.min(1, bucketAvg * 18 + bucketPeak * 1.25);
        const mirroredIndex = idx <= (WAVE_BAR_COUNT - 1) / 2 ? idx : WAVE_BAR_COUNT - 1 - idx;
        const centerBias =
          0.68 + (1 - mirroredIndex / ((WAVE_BAR_COUNT - 1) / 2 + 0.0001)) * 0.42;
        const variance = WAVE_VARIANCE[idx] || 1;
        const target =
          WAVE_BASELINE +
          (bucketEnergy * 58 + envelope * 26) * centerBias * variance;
        const smoothed = previous[idx] + (target - previous[idx]) * WAVE_SMOOTHING;
        return Math.max(WAVE_BASELINE, Math.min(100, smoothed));
      });

      waveformLevelsRef.current = nextLevels;
      setWaveformLevels(nextLevels);
      animationFrameRef.current = requestAnimationFrame(renderWaveform);
    };

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    renderWaveform();
  }

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

  useImperativeHandle(ref, () => ({
    syncDocs: syncDocsToServer,
    clearChat: clearChatOnly,
    clearChatOnly
  }));

  function stopVoiceIfRunning() {
    try {
      if (listening) speechRef.current?.stop?.();
    } catch {}
    stopAudioVisualization();
    setListening(false);
  }

  function toggleVoice() {
    if (busy || serverPending) return;

    try {
      textareaRef.current?.focus?.();
    } catch {}

    if (!speechRef.current || !speechRef.current.supported) {
      pushBanner("Voice typing is not supported in this browser.");
      return;
    }

    if (listening) {
      stopVoiceIfRunning();
      return;
    }

    startAudioVisualization()
      .then(() => {
        setListening(true);
        speechRef.current.start();
      })
      .catch((error) => {
        stopAudioVisualization();
        setListening(false);
        pushBanner(String(error?.message || "Unable to access microphone input."));
      });
  }

  async function onSend() {
    stopVoiceIfRunning();

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

  const micDisabled = busy || serverPending;
  const micBtnStyle = {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: listening ? "1px solid #111" : "1px solid #ddd",
    background: "#fff",
    cursor: micDisabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    opacity: micDisabled ? 0.55 : 1,
    userSelect: "none"
  };

  const micWrapStyle = {
    position: "relative",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end"
  };

  const micTipStyle = {
    position: "absolute",
    right: 0,
    bottom: 52,
    width: 260,
    background: "#111827",
    color: "#fff",
    borderRadius: 12,
    padding: "10px 10px",
    fontSize: 12.5,
    lineHeight: 1.35,
    boxShadow: "0 12px 28px rgba(0,0,0,0.20)",
    zIndex: 50
  };

  const listeningStatusStyle = {
    marginTop: 6,
    minHeight: 16,
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 700,
    color: "#111",
    whiteSpace: "nowrap",
    visibility: listening ? "visible" : "hidden"
  };

  return (
    <div
      className="thoxie-aiChat"
      style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}
    >
      {!hideDockToolbar ? (
        <div className="thoxie-aiChat__controls">
          <button onClick={syncDocsToServer} type="button" disabled={!caseId || serverPending}>
            {serverPending ? "Syncing…" : "Sync Docs"}
          </button>
          <button onClick={clearChatOnly} type="button" disabled={busy || serverPending}>
            Clear Chat
          </button>
        </div>
      ) : null}

      <div className="thoxie-aiChat__messages" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {(messages || []).map((m, idx) => {
          const role = m?.role === "user" ? "user" : "assistant";
          return (
            <div key={idx} className={`msg msg--${role}`}>
              <div className="msg__bubble">
                <div className="msg__role">{role}</div>
                <div className="msg__content" style={{ whiteSpace: "pre-wrap" }}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`thoxie-aiChat__wave ${listening ? "is-listening" : "is-idle"}`}
        aria-hidden="true"
      >
        <div className="thoxie-aiChat__waveTrack">
          {waveformLevels.map((height, idx) => (
            <span
              key={idx}
              className="thoxie-aiChat__waveBar"
              style={{
                height: `${height}%`
              }}
            />
          ))}
        </div>
      </div>

      <div className="thoxie-aiChat__inputRow">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask THOXIE…"
          rows={3}
          disabled={busy || serverPending}
        />

        <div style={micWrapStyle}>
          <button
            type="button"
            onClick={toggleVoice}
            disabled={micDisabled}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
            style={micBtnStyle}
            onMouseEnter={() => setShowMicTip(true)}
            onMouseLeave={() => setShowMicTip(false)}
            onFocus={() => setShowMicTip(true)}
            onBlur={() => setShowMicTip(false)}
          >
            {listening ? "✕" : "🎙️"}
          </button>

          <div aria-live="polite" style={listeningStatusStyle}>
            Listening...
          </div>

          {showMicTip ? (
            <div style={micTipStyle} role="note">
              Voice dictation (beta). Your browser may ask once for microphone permission.
              <br />
              <br />
              If blocked, enable mic permissions for this site in the address bar settings.
            </div>
          ) : null}
        </div>

        <button onClick={onSend} type="button" disabled={!canSend || serverPending}>
          {busy ? "Working…" : "Send"}
        </button>
      </div>
    </div>
  );
});

export default AIChatbox;
