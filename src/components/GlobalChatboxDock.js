// Path: /src/components/GlobalChatboxDock.js
"use client";

import { useEffect, useMemo, useState } from "react";
import AIChatbox from "./AIChatbox";

const OPEN_KEY = "thoxie.chatDock.open.v1";

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

export default function GlobalChatboxDock() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  if (!mounted) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: 9999,
        width: open ? "min(420px, calc(100vw - 32px))" : "auto"
      }}
    >
      {open ? (
        <div
          style={{
            boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
            borderRadius: "16px",
            overflow: "hidden",
            background: "#fff",
            maxHeight: "75vh", // cap height so it doesn't wipe out top-right nav
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderBottom: "1px solid #eee",
              background: "#111",
              color: "#fff",
              fontWeight: 900
            }}
          >
            <div>THOXIE Chat</div>
            <button
              type="button"
              onClick={closeDock}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff",
                borderRadius: "10px",
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 900
              }}
              aria-label="Close chat"
              title="Close (Esc)"
            >
              Close
            </button>
          </div>

          <div style={{ padding: "10px", overflow: "auto" }}>
            <AIChatbox caseId={caseId || undefined} onClose={closeDock} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openDock}
          style={{
            border: "1px solid #ddd",
            background: "#111",
            color: "#fff",
            borderRadius: "999px",
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: 900
          }}
          aria-label="Open chat"
          title="Open chat"
        >
          Chat
        </button>
      )}
    </div>
  );
}


