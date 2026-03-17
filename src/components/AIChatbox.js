/* PATH: src/components/AIChatbox.js */
/* FILE: AIChatbox.js */
/* ACTION: FULL OVERWRITE */

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

const MAX_INPUT_CHARS = 6000;
const WAVE_BAR_COUNT = 40;
const WAVE_TRACK_HEIGHT = 56;
const WAVE_MIN_HEIGHT = 4;
const WAVE_MAX_HEIGHT = 52;
const WAVE_BASELINE = 5;
const WAVE_ATTACK = 0.48;
const WAVE_RELEASE = 0.18;
const WAVE_NOISE_FLOOR = 0.014;
const WAVE_GAIN = 4.2;
const WAVE_GLOBAL_WEIGHT = 10;
const WAVE_LOCAL_WEIGHT = 34;
const WAVE_VARIANCE = [
  0.92, 1.08, 0.96, 1.14, 0.90,
  1.12, 0.98, 1.10, 0.94, 1.06,
  0.91, 1.13, 0.97, 1.09, 0.93,
  1.15, 0.95, 1.07, 0.92, 1.11,
  0.94, 1.09, 0.96, 1.12, 0.91,
  1.10, 0.98, 1.14, 0.93, 1.07,
  0.92, 1.11, 0.97, 1.08, 0.95,
  1.13, 0.96, 1.10, 0.94, 1.12
];

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function initialAssistantMessage() {
  return {
    role: "assistant",
    content:
      "Hi — I’m the Genie. Tell me what you’re trying to do in California small claims and I’ll help you structure it step-by-step.",
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
    const center = (WAVE_BAR_COUNT - 1) / 2;
    const distance = Math.abs(idx - center) / (center || 1);
    const centerLift = (1 - distance) * 1.8;
    const offset = idx % 4 === 0 ? 1.8 : idx % 2 === 0 ? 1.0 : 0.5;
    return clamp(WAVE_BASELINE + centerLift + offset, WAVE_MIN_HEIGHT, WAVE_MAX_HEIGHT);
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
  const waveformEnvelopeRef = useRef(0);
  const waveformCeilingRef = useRef(0.12);

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
  }, [caseId, messages]);

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

    try {
      mediaStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    mediaStreamRef.current = null;

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close?.();
      } catch {}
    }
    audioContextRef.current = null;

    waveformEnvelopeRef.current = 0;
    waveformCeilingRef.current = 0.12;
    const baseline = createBaselineWaveform();
    waveformLevelsRef.current = baseline;
    setWaveformLevels(baseline);
  }

  async function startAudioVisualization() {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Microphone input is not available in this browser.");
    }

    stopAudioVisualization();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("AudioContext is not supported in this browser.");
    }

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.72;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceNodeRef.current = source;
    mediaStreamRef.current = stream;

    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(freqData);

      const half = Math.floor(freqData.length * 0.52);
      let globalSum = 0;
      for (let i = 0; i < half; i += 1) globalSum += freqData[i];
      const globalAvg = globalSum / Math.max(1, half) / 255;

      const nextEnvelope =
        waveformEnvelopeRef.current * (globalAvg > waveformEnvelopeRef.current ? 1 - WAVE_ATTACK : 1 - WAVE_RELEASE) +
        globalAvg * (globalAvg > waveformEnvelopeRef.current ? WAVE_ATTACK : WAVE_RELEASE);

      waveformEnvelopeRef.current = nextEnvelope;

      const nextCeiling = Math.max(
        0.08,
        waveformCeilingRef.current * 0.96,
        nextEnvelope * 1.18
      );
      waveformCeilingRef.current = nextCeiling;

      const barLevels = [];
      const segSize = Math.max(2, Math.floor(half / WAVE_BAR_COUNT));

      for (let bar = 0; bar < WAVE_BAR_COUNT; bar += 1) {
        const start = bar * segSize;
        const end = Math.min(half, start + segSize);
        let localSum = 0;

        for (let i = start; i < end; i += 1) {
          localSum += freqData[i];
        }

        const localAvg = localSum / Math.max(1, end - start) / 255;
        const normalizedGlobal = clamp(
          (nextEnvelope - WAVE_NOISE_FLOOR) / Math.max(0.0001, nextCeiling - WAVE_NOISE_FLOOR),
          0,
          1
        );
        const normalizedLocal = clamp(
          (localAvg - WAVE_NOISE_FLOOR) / Math.max(0.0001, nextCeiling - WAVE_NOISE_FLOOR),
          0,
          1
        );

        const weighted =
          normalizedGlobal * WAVE_GLOBAL_WEIGHT +
          normalizedLocal * WAVE_LOCAL_WEIGHT;

        const withVariance = weighted * WAVE_VARIANCE[bar % WAVE_VARIANCE.length] * WAVE_GAIN;
        const px = clamp(
          WAVE_BASELINE + withVariance,
          WAVE_MIN_HEIGHT,
          WAVE_MAX_HEIGHT
        );

        barLevels.push(px);
      }

      waveformLevelsRef.current = barLevels;
      setWaveformLevels(barLevels);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    return () => {
      try {
        abortRef.current?.abort?.();
      } catch {}
      stopAudioVisualization();
    };
  }, []);

  async function refreshRagStatusFromServer(source = "status") {
    if (!caseId) return;

    try {
      const r = await fetch(`/api/rag/status?caseId=${encodeURIComponent(caseId)}`);
      const j = await r.json().catch(() => null);

      if (!r.ok) {
        pushStatus({
          source,
          ok: false,
          error: j?.error || `RAG status failed (${r.status}).`
        });
        return;
      }

      pushStatus({
        source,
        ok: true,
        ready: !!j?.ready,
        indexedCount: Number(j?.indexedCount || 0),
        chunkCount: Number(j?.chunkCount || 0),
        docs: Array.isArray(j?.documents) ? j.documents : []
      });
    } catch (e) {
      pushStatus({
        source,
        ok: false,
        error: String(e?.message || e)
      });
    }
  }

  useEffect(() => {
    refreshRagStatusFromServer("mount");
  }, [caseId]);

  async function syncDocsToServer() {
    if (!caseId) {
      pushBanner("No active case selected.");
      return;
    }

    let docsForCase = [];
    try {
      docsForCase = await DocumentRepository.listByCaseId(caseId);
    } catch {
      docsForCase = [];
    }

    const localMeta = getLocalRagMeta(caseId);

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
          caseId: d.caseId || caseId,
          name: d.name,
          filename: d.name,
          mimeType: d.mimeType || d.mime || "",
          size: asB64.bytes,
          docType: d.docType || d.docTypeLabel || "evidence",
          exhibitDescription: d.exhibitDescription || "",
          evidenceCategory: d.evidenceCategory || "",
          evidenceSupports: Array.isArray(d.evidenceSupports) ? d.evidenceSupports : [],
          extractionMethod: typeof d.extractionMethod === "string" ? d.extractionMethod : "",
          ocrStatus: typeof d.ocrStatus === "string" ? d.ocrStatus : "",
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

      const indexedOk = Array.isArray(j?.indexed)
        ? j.indexed.filter((item) => item && item.ok).length
        : 0;
      const indexedFailed = Array.isArray(j?.indexed)
        ? j.indexed.filter((item) => item && item.ok === false).length
        : 0;

      pushBanner(
        `Synced ${indexedOk} doc(s) to server evidence storage.${
          indexedFailed ? ` ${indexedFailed} failed.` : ""
        }${tooLargeCount ? ` ${tooLargeCount} skipped (too large).` : ""}`,
        5000
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

  return (
    <div className="scg-chat-shell">
      {!hideDockToolbar && (
        <div className="scg-chat-toolbar">
          <button onClick={syncDocsToServer} type="button" disabled={!caseId || serverPending}>
            {serverPending ? "Syncing…" : "Sync Docs"}
          </button>
          <button onClick={clearChatOnly} type="button" disabled={busy || serverPending}>
            Clear Chat
          </button>
        </div>
      )}

      <div className="scg-chat-messages">
        {messages.map((m, idx) => (
          <div
            key={`${m.at || idx}-${idx}`}
            className={`msg msg--${m.role === "user" ? "user" : "assistant"}`}
          >
            <div className="msg__bubble">
              <div className="msg__role">{m.role === "user" ? "You" : "Genie"}</div>
              <div className="msg__content" style={{ whiteSpace: "pre-wrap" }}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {listening && (
        <div className="scg-wave-wrap" aria-live="polite">
          <div
            className="scg-wave"
            style={{
              height: WAVE_TRACK_HEIGHT,
              alignItems: "end"
            }}
          >
            {waveformLevels.map((level, idx) => (
              <span
                key={idx}
                className="scg-wave__bar"
                style={{
                  height: `${level}px`
                }}
              />
            ))}
          </div>
          <div className="scg-wave-label">Listening...</div>
        </div>
      )}

      <div className="scg-chat-inputRow">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the Genie about your California small claims issue..."
          rows={4}
          maxLength={MAX_INPUT_CHARS}
          disabled={busy || serverPending}
        />

        <div className="scg-chat-actions">
          <div
            style={micWrapStyle}
            onMouseEnter={() => setShowMicTip(true)}
            onMouseLeave={() => setShowMicTip(false)}
          >
            <button
              type="button"
              onClick={toggleVoice}
              disabled={micDisabled}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              title={listening ? "Stop voice input" : "Start voice input"}
              style={micBtnStyle}
            >
              🎤
            </button>

            {showMicTip && !listening && (
              <div className="scg-mic-tip">Voice input</div>
            )}
          </div>

          <button onClick={onSend} type="button" disabled={!canSend || serverPending}>
            {busy ? "Thinking…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AIChatbox;
