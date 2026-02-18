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

  useEffect(() => {
    setMounted(true);
    setOpen(readOpenPref());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    function onOpen() {
      setOpen(true);
      writeOpenPref(true);
    }

    window.addEventListener("thoxie:open-chat", onOpen);
    return () => window.removeEventListener("thoxie:open-chat", onOpen);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: 9999,
        width: open ? "420px" : "auto"
      }}
    >
      {open ? (
        <div
          style={{
            boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
            borderRadius: "16px",
            overflow: "hidden",
            background: "#fff"
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
              onClick={() => {
                setOpen(false);
                writeOpenPref(false);
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff",
                borderRadius: "10px",
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 900
              }}
            >
              Close
            </button>
          </div>

          <div style={{ padding: "10px" }}>
            <AIChatbox caseId={caseId || undefined} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            writeOpenPref(true);
          }}
          style={{
            border: "1px solid #ddd",
            background: "#111",
            color: "#fff",
            borderRadius: "999px",
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          Chat
        </button>
      )}
    </div>
  );
}


