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

          {/* ===== HEADER TOOLBAR ===== */}
          <div
            className="thoxie-chat-header"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "nowrap"
            }}
          >
            {/* Title */}
            <div
              className="thoxie-chat-title"
              style={{ marginRight: 8 }}
            >
              THOXIE Chat
            </div>

            {/* Sync Docs */}
            <button className="thoxie-btn">
              Sync Docs
            </button>

            {/* Clear Chat */}
            <button className="thoxie-btn">
              Clear Chat
            </button>

            {/* User Email field (label above input) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginLeft: 8
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900 }}>
                User Email
              </div>
              <input
                placeholder="example@email.com"
                style={{
                  marginTop: 2,
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  fontSize: 14,
                  width: 220
                }}
              />
            </div>

            {/* Spacer pushes Close to right */}
            <div style={{ flex: 1 }} />

            {/* Close button */}
            <button
              className="thoxie-btn"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          {/* ===== CHAT BODY ===== */}
          <div className="thoxie-chat-body">
            <AIChatbox />
          </div>

        </div>
      )}
    </div>
  );
}
