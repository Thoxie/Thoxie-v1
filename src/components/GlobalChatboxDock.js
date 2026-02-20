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
          {/* HEADER */}
          <div
            className="thoxie-chat-header"
            style={{
              display: "flex",
              alignItems: "center",      // ✅ vertical centering baseline
              gap: "12px",
              flexWrap: "wrap",
              padding: "12px",
            }}
          >
            {/* Title (wrapping allowed) */}
            <div
              className="thoxie-chat-title"
              style={{
                fontWeight: 900,
                lineHeight: 1.1,
                marginRight: "8px",
              }}
            >
              THOXIE Chat
            </div>

            {/* Sync Docs */}
            <button
              className="thoxie-btn"
              style={{
                height: "44px",
                display: "flex",
                alignItems: "center",    // ✅ center text vertically
                justifyContent: "center",
                padding: "0 16px",
              }}
            >
              Sync Docs
            </button>

            {/* Clear Chat */}
            <button
              className="thoxie-btn"
              style={{
                height: "44px",
                display: "flex",
                alignItems: "center",    // ✅ center text vertically
                justifyContent: "center",
                padding: "0 16px",
              }}
            >
              Clear Chat
            </button>

            {/* User Email (label + input) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",  // ✅ vertically center block
                marginLeft: "8px",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  marginBottom: "4px",
                }}
              >
                User Email
              </label>

              <input
                type="email"
                placeholder="example@email.com"
                style={{
                  height: "36px",
                  padding: "6px 10px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Spacer pushes Close to right */}
            <div style={{ flex: 1 }} />

            {/* Close Button */}
            <button
              className="thoxie-chat-closeButton"
              onClick={() => setOpen(false)}
              style={{
                height: "44px",
                display: "flex",
                alignItems: "center",     // ✅ vertical center
                justifyContent: "center",
                padding: "0 16px",
              }}
            >
              Close
            </button>
          </div>

          {/* BODY */}
          <div className="thoxie-chat-body">
            <AIChatbox />
          </div>
        </div>
      )}
    </div>
  );
}
