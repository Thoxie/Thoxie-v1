// Path: /src/components/GlobalChatboxDock.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AIChatbox from "./AIChatbox";

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

    function onOpen() {
      openDock();
    }

    window.addEventListener("thoxie:open-chat", onOpen);
    return () => window.removeEventListener("thoxie:open-chat", onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") closeDock();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted) return;
    writeEmail(userEmail);
  }, [userEmail, mounted]);

  if (!mounted) return null;

  // White buttons with black text (match Clear Chat)
  const headerBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    fontWeight: 900,
    lineHeight: 1.1
  };

  // Email input matches the same visual "box" size as the buttons
  const headerEmailInputStyle = {
    height: 40,                 // same row height feel as buttons
    padding: "10px 12px",       // match button padding
    borderRadius: 12,           // match button radius
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    fontSize: 14,
    lineHeight: 1.1,
    width: 160                 // reduced so it doesn't read larger than buttons
  };

  return (
    <div className="thoxie-chat-dock">
      {open ? (
        <div className="thoxie-chat-panel" role="dialog" aria-label="THOXIE Chat">
          <div
            className="thoxie-chat-header"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            {/* Title: FORCE THOXIE above Chat */}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
              <div className="thoxie-chat-title">THOXIE</div>
              <div className="thoxie-chat-title">Chat</div>
            </div>

            <button
              type="button"
              style={headerBtnStyle}
              onClick={() => chatRef.current?.syncDocs?.()}
              title="Index documents for retrieval"
            >
              Sync Docs
            </button>

            <button
              type="button"
              style={headerBtnStyle}
              onClick={() => chatRef.current?.clearChat?.()}
              title="Clear chat history for this case"
            >
              Clear Chat
            </button>

            {/* User Email: label stays above; input box resized to match button boxes */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 12, color: "#fff", lineHeight: 1.05 }}>
                User Email
              </div>
              <input
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="example@email.com"
                style={{ marginTop: 4, ...headerEmailInputStyle }}
              />
            </div>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={closeDock}
              style={headerBtnStyle}
              aria-label="Close chat"
              title="Close (Esc)"
            >
              Close
            </button>
          </div>

          <div className="thoxie-chat-body">
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
        <button
          type="button"
          onClick={openDock}
          className="thoxie-chat-openButton"
          aria-label="Open THOXIE"
          title="Open THOXIE"
        >
          Ask THOXIE
        </button>
      )}
    </div>
  );
}
