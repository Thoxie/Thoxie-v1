// Path: /app/_lib/ai/client/sendChat.js

export async function sendChat({ messages, caseId = null, mode = "chat" }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      caseId,
      mode
    })
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

