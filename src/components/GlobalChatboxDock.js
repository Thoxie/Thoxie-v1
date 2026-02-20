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
    <div className="thoxie-chat-dock">
      {open ? (
        <div className="thoxie-chat-panel" role="dialog" aria-label="THOXIE Chat">
          <div className="thoxie-chat-header">
            <div>
              <div className="thoxie-chat-title">THOXIE Chat</div>
            </div>

            <button
              type="button"
              onClick={closeDock}
              className="thoxie-chat-closeButton"
              aria-label="Close chat"
              title="Close (Esc)"
            >
              Close
            </button>
          </div>

          <div className="thoxie-chat-body">
            <AIChatbox caseId={caseId || undefined} onClose={closeDock} />
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
