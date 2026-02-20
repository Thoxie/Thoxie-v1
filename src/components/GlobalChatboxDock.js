// Path: /src/components/GlobalChatboxDock.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AIChatbox from "./AIChatbox";

const OPEN_KEY = "thoxie.chatDock.open.v1";
const EMAIL_KEY = "thoxie.betaId.v1"; // keep same storage key for continuity

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

  // ESC closes the dock (prevents "stuck open")
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
    height: 40,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    fontWeight: 900,
    lineHeight: 1.1
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
            {/* Title can wrap (THOXIE on top, Chat under) */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="thoxie-chat-title">THOXIE Chat</div>
            </div>

            {/* Header actions (white background, black text) */}
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

            {/* User Email: label above input, smaller and aligned with buttons */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center"
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 12, color: "#fff", lineHeight: 1.05 }}>
                User Email
              </div>
              <input
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="example@email.com"
                style={{
                  marginTop: 4,
                  height: 40,
                  width: 200,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  fontSize: 14
                }}
              />
            </div>

            {/* Spacer pushes Close to right */}
            <div style={{ flex: 1 }} />

            {/* Close button: white background, black text (match others) */}
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
