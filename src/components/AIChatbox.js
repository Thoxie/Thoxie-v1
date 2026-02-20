// Path: /src/components/AIChatbox.js
"use client";

import { useEffect, useRef, useState } from "react";

export default function AIChatbox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  function addMessage(role, text) {
    setMessages(prev => [
      ...prev,
      { id: Date.now() + Math.random(), role, text }
    ]);
  }

  async function onSend() {
    const text = input.trim();
    if (!text) return;

    addMessage("user", text);
    setInput("");

    // Placeholder assistant reply
    setTimeout(() => {
      addMessage("assistant", "Response received.");
    }, 400);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="thoxie-ai-wrap">

      {/* Messages */}
      <div ref={listRef} className="thoxie-ai-messages">
        <div className="thoxie-ai-messagesInner">
          {messages.map(m => (
            <div key={m.id} className="thoxie-msg">
              <div className="thoxie-msgHeader">
                {m.role === "user" ? "You" : "THOXIE"}
              </div>
              <div className="thoxie-msgBody">{m.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Input row */}
      <div className="thoxie-ai-inputRow">
        <textarea
          className="thoxie-ai-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message…"
        />
        <button className="thoxie-btn thoxie-btnPrimary" onClick={onSend}>
          Send
        </button>
      </div>

    </div>
  );
}
