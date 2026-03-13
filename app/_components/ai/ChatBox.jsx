/* FILE: app/_components/ai/ChatBox.jsx */
/* ACTION: FULL OVERWRITE EXISTING FILE */

"use client";

import { useMemo, useState } from "react";
import { sendChat } from "../../_lib/ai/client/sendChat";

export default function ChatBox({ caseId = null }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const safeCaseId = useMemo(
    () => (typeof caseId === "string" ? caseId.trim() : ""),
    [caseId]
  );

  async function handleSend() {
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input.trim() }];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChat({
        messages: newMessages,
        caseId: safeCaseId,
      });

      setMessages([
        ...newMessages,
        res.reply || { role: "assistant", content: "(no response)" },
      ]);
    } catch (e) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: e?.message || "Error contacting AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ minHeight: 300, border: "1px solid #ccc", padding: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", marginTop: 8 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Small Claims Genie..."
        />
        <button onClick={handleSend} disabled={loading} style={{ marginLeft: 8 }}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
