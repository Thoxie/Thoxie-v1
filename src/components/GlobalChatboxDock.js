// Path: /src/components/GlobalChatboxDock.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as AIChatboxModule from "./AIChatbox";

// Robust resolution: supports either
//   - export default AIChatbox
//   - export function AIChatbox / export const AIChatbox
// Without removing any existing functionality.
const AIChatbox = AIChatboxModule?.default ?? AIChatboxModule?.AIChatbox;

const OPEN_KEY = "thoxie.chatDock.open.v1";
const EMAIL_KEY = "thoxie.betaId.v1";

function getCaseIdFromUrl() {
  try {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    return (u.searchParams.get("caseId") || "").trim();
  } catch {
    return "";
  }
}

function readOpenPref() {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOpenPref(v) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OPEN_KEY, v ? "1" : "0");
  } catch {}
}

function readEmail() {
  try {
    if (typeof window === "undefined") return "";
    return (window.localStorage.getItem(EMAIL_KEY) || "").trim();
  } catch {
    return "";
  }
}

function writeEmail(v) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EMAIL_KEY, (v || "").trim());
  } catch {}
}

export default function GlobalChatboxDock() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const chatRef = useRef(null);
  const caseId = useMemo(() => getCaseIdFromUrl(), [mounted]);

  function closeDock() {
    setOpen(false);
    writeOpenPref(false);
  }

  function openDock() {
    setOpen(true);
    writeOpenPref(true);
  }

  useEffect(() => {
    setMounted(true);
    setOpen(readOpenPref());
    setUserEmail(readEmail());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    writeEmail(userEmail);
  }, [userEmail, mounted]);

  const headerBtnStyle = {
    background: "#0B0B0B",
    color: "#fff",
    border: "2px solid rgba(255,255,255,0.20)",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: "nowrap"
  };

  const headerEmailInputStyle = {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.25)",
    padding: "8px 10px",
    outline: "none",
    width: 220,
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 12
  };

  return (
    <div className="thoxie-chat-dock">
      {open ? (
        <div
          className="thoxie-chat-panel"
          role="dialog"
          aria-label="THOXIE Chat"
          // ✅ UI-only stabilization: restore “nearly full-height” workspace
          // Anchors height to viewport so future layout tweaks don’t shrink it.
          style={{
            height: "calc(100vh - 120px)",
            maxHeight: "calc(100vh - 120px)"
          }}
        >
          {/* HEADER */}
          <div
            className="thoxie-chat-header"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            {/* Title — THOXIE above Chat */}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
              <div className="thoxie-chat-title">THOXIE</div>
              <div className="thoxie-chat-title">Chat</div>
            </div>

            <button type="button" style={headerBtnStyle} onClick={() => chatRef.current?.syncDocs?.()}>
              Sync Docs
            </button>

            <button type="button" style={headerBtnStyle} onClick={() => chatRef.current?.clearChat?.()}>
              Clear Chat
            </button>

            {/* User Email */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 12, color: "#fff", lineHeight: 1.05 }}>User Email</div>

              <input
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="example@email.com"
                style={{ marginTop: 4, ...headerEmailInputStyle }}
              />
            </div>

            <div style={{ flex: 1 }} />

            <button type="button" onClick={closeDock} style={headerBtnStyle}>
              Close
            </button>
          </div>

          {/* BODY */}
          {/* UI-only: prevent outer scroll; inner message list will scroll */}
          <div className="thoxie-chat-body" style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            <AIChatbox
              ref={chatRef}
              caseId={caseId || undefined}
              onClose={closeDock}
              hideDockToolbar={true}
              testerId={userEmail}
              onTesterIdChange={setUserEmail}
            />
          </div>
        </div>
      ) : (
        <button type="button" onClick={openDock} className="thoxie-chat-openButton">
           AI Help
        </button>
      )}
    </div>
  );
}
