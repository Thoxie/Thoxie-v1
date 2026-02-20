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
    writeEmail(userEmail);
  }, [userEmail, mounted]);

  if (!mounted) return null;

  // Base white button style (unchanged)
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

  // ✅ Email input now matches SAME vertical box size as buttons
  const headerEmailInputStyle = {
    padding: "10px 12px",   // same top/bottom as buttons
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    fontSize: 14,
    lineHeight: 1.1,
    width: 160              // width unchanged
  };

  return (
    <div className="thoxie-chat-dock">
      {open ? (
        <div className="thoxie-chat-panel" role="dialog" aria-label="THOXIE Chat">
          
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

            <button
              type="button"
              style={headerBtnStyle}
              onClick={() => chatRef.current?.syncDocs?.()}
            >
              Sync Docs
            </button>

            <button
              type="button"
              style={headerBtnStyle}
              onClick={() => chatRef.current?.clearChat?.()}
            >
              Clear Chat
            </button>

            {/* User Email */}
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
            >
              Close
            </button>
          </div>

          {/* BODY */}
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
        >
          Ask THOXIE
        </button>
      )}
    </div>
  );
}
