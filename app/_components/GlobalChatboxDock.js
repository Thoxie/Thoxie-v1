// Path: /app/_components/GlobalChatboxDock.js
"use client";

/**
 * LEGACY COMPONENT (currently not used by the running app).
 *
 * The live app imports the canonical dock from:
 *   /src/components/GlobalChatboxDock.js
 *
 * This file is kept to avoid breaking any accidental/legacy imports, but
 * you should edit the canonical file for UI changes.
 */

import { useState } from "react";
import ChatBox from "../components/ai/ChatBox";

// Optional: exposes the canonical dock as a named export for clarity.
export { default as CanonicalGlobalChatboxDock } from "../../src/components/GlobalChatboxDock";

export default function GlobalChatboxDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          padding: "12px 16px",
          borderRadius: 999,
          border: "none",
          background: "#111",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
        }}
      >
        {open ? "Close AI" : "Ask THOXIE"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 72,
            right: 16,
            width: 380,
            maxHeight: "70vh",
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            overflow: "hidden",
            zIndex: 9998
          }}
        >
          <ChatBox />
        </div>
      )}
    </>
  );
}
