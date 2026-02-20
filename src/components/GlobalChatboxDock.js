// Path: /src/components/GlobalChatboxDock.js
"use client";

import { useState } from "react";
import AIChatbox from "./AIChatbox";

export default function GlobalChatboxDock() {
  const [open, setOpen] = useState(false);

  return (
    <div className="thoxie-chat-dock">
      {!open && (
        <button
          className="thoxie-chat-openButton"
          onClick={() => setOpen(true)}
        >
          Ask THOXIE
        </button>
      )}

      {open && (
        <div className="thoxie-chat-panel">

          {/* ===== STATIC HEADER ===== */}
          <div className="thoxie-chat-header">

            {/* LEFT SIDE — TITLE + CONTROLS */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div className="thoxie-chat-title">THOXIE Chat</div>

              {/* Sync Docs */}
              <button className="thoxie-btn thoxie-btnPrimary">
                Sync Docs
              </button>

              {/* Clear Chat */}
              <button className="thoxie-btn">
                Clear Chat
              </button>

              {/* User Email */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontWeight: 900, fontSize: 12 }}>User Email</div>
                <input
                  placeholder="example@email.com"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    fontSize: 14,
                    width: 220
                  }}
                />
              </div>
            </div>

            {/* RIGHT SIDE — CLOSE BUTTON */}
            <button
              className="thoxie-chat-closeButton"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          {/* ===== SCROLLABLE BODY ===== */}
          <div className="thoxie-chat-body">
            <AIChatbox />
          </div>

        </div>
      )}
    </div>
  );
}
