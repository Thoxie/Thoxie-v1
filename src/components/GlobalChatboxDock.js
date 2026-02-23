// Path: /src/components/GlobalChatboxDock.js
"use client";

import { useEffect, useRef, useState } from "react";
import AIChatbox from "./AIChatbox";

export default function GlobalChatboxDock() {
  const [open, setOpen] = useState(false);
  const chatRef = useRef(null);

  // Restore persisted open state (if you use it)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("thoxie.chat.open");
      if (saved === "1") setOpen(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("thoxie.chat.open", open ? "1" : "0");
    } catch {}
  }, [open]);

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: "14px 18px",
            borderRadius: 12,
            border: "none",
            background: "#0B5FFF",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
          }}
        >
          THOXIE Chat
        </button>
      )}

      {/* Main dock panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 9999,

            // 🔴 CRITICAL: Viewport-based height (restores full workspace feel)
            height: "calc(100vh - 120px)",

            // Keep your current width behavior
            width: 420,
            maxWidth: "calc(100vw - 48px)",

            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f9fafb"
            }}
          >
            <div style={{ fontWeight: 800 }}>THOXIE</div>

            <button
              onClick={() => setOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 18,
                cursor: "pointer"
              }}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Chat area (fills remaining space) */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <AIChatbox ref={chatRef} hideDockToolbar />
          </div>
        </div>
      )}
    </>
  );
}
