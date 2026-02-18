// Path: /app/ai-test/page.jsx
import ChatBox from "../_components/ai/ChatBox";

export const metadata = {
  title: "THOXIE — AI Test",
  description: "AI chatbox wiring test page"
};

export default function AITestPage() {
  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>AI Test Page</h1>
      <p style={{ marginBottom: 12, color: "#444" }}>
        This page is only to validate the chat UI wiring + server endpoint.
      </p>
      <ChatBox />
    </main>
  );
}

