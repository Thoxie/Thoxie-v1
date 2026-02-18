// Path: /app/ai-test/page.jsx
import ChatBox from "../components/ai/ChatBox";

export const metadata = {
  title: "THOXIE — AI Test",
  description: "AI chatbox wiring test page"
};

export default function AITestPage() {
  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>AI Test Page</h1>
      <p style={{ marginBottom: 12, color: "#555" }}>
        This page renders the shared chat UI component used across THOXIE.
      </p>
      <ChatBox />
    </main>
  );
}
