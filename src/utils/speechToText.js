// Path: /src/utils/speechToText.js
"use client";

/*
  Minimal SpeechRecognition wrapper.
  - Uses browser SpeechRecognition / webkitSpeechRecognition when available.
  - Emits FINAL transcripts only (interim ignored) to reduce UI/input conflicts.
  - No side effects outside the component using it.
*/

function getCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return !!getCtor();
}

export function createSpeechRecognizer({ onFinalText, onError, onEnd, lang = "en-US" }) {
  const Ctor = getCtor();
  if (!Ctor) {
    return { supported: false, start() {}, stop() {}, abort() {} };
  }

  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = lang;

  rec.onresult = (event) => {
    try {
      if (!event?.results) return;

      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r?.isFinal) {
          const t = r?.[0]?.transcript ? String(r[0].transcript) : "";
          if (t) finalText += t;
        }
      }

      finalText = String(finalText || "").trim();
      if (finalText && typeof onFinalText === "function") onFinalText(finalText);
    } catch (e) {
      if (typeof onError === "function") {
        onError({ name: "onresult_error", message: String(e?.message || e) });
      }
    }
  };

  rec.onerror = (event) => {
    const name = event?.error ? String(event.error) : "speech_error";
    const message =
      event?.message
        ? String(event.message)
        : name === "not-allowed" || name === "service-not-allowed"
          ? "Microphone permission was blocked."
          : name;

    if (typeof onError === "function") onError({ name, message });
  };

  rec.onend = () => {
    if (typeof onEnd === "function") onEnd();
  };

  function safeStart() {
    try {
      rec.start();
    } catch (e) {
      if (typeof onError === "function") {
        onError({ name: "start_failed", message: String(e?.message || e) });
      }
    }
  }

  function safeStop() {
    try {
      rec.stop();
    } catch {}
  }

  function safeAbort() {
    try {
      rec.abort();
    } catch {}
  }

  return { supported: true, start: safeStart, stop: safeStop, abort: safeAbort };
}
