// Path: /src/components/AIChatbox.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaseRepository } from "../../app/_repository/caseRepository";
import { DocumentRepository } from "../../app/_repository/documentRepository";

function storageKey(caseId) {
  return `thoxie.aiChat.v1.${caseId || "no-case"}`;
}

function nowTs() {
  return new Date().toISOString();
}

function safeJsonParse(s, fallback) {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * v1 Chat UI Scaffold (No LLM Yet)
 * - Works on-screen today
 * - Persists chat per caseId in localStorage
 * - Uses case + document metadata to generate helpful deterministic guidance
 * - Designed so later we can replace generateAssistantReply() with real AI calls + RAG
 */
export default function AIChatbox({ caseId: caseIdProp }) {
  const [caseId, setCaseId] = useState(caseIdProp || "");
  const [cases, setCases] = useState([]);
  const [docs, setDocs] = useState([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [banner, setBanner] = useState("");
  const listRef = useRef(null);

  const selectedCase = useMemo(() => {
    if (!caseId) return null;
    return CaseRepository.getById(caseId);
  }, [caseId, cases]);

  useEffect(() => {
    // load case list
    const all = CaseRepository.getAll();
    setCases(all);
  }, []);

  useEffect(() => {
    // initialize from prop changes
    if (caseIdProp && caseIdProp !== caseId) setCaseId(caseIdProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseIdProp]);

  useEffect(() => {
    // load messages for the selected case
    const raw = localStorage.getItem(storageKey(caseId));
    const saved = raw ? safeJsonParse(raw, []) : [];
    if (Array.isArray(saved) && saved.length) {
      setMessages(saved);
    } else {
      // seed a useful first assistant message
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          ts: nowTs(),
          text:
            "AI Assistant (v1 scaffold) is active. I’m not connected to an AI model yet, but I can help you organize the case, track what’s missing, and guide your next steps based on what you’ve entered."
        }
      ]);
    }
  }, [caseId]);

  useEffect(() => {
    // load documents for the selected case
    let cancelled = false;

    async function load() {
      if (!caseId) {
        setDocs([]);
        return;
      }
      const rows = await DocumentRepository.listByCaseId(caseId);
      if (!cancelled) setDocs(rows || []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    // persist messages
    localStorage.setItem(storageKey(caseId), JSON.stringify(messages || []));
    // auto-scroll
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, caseId]);

  function pushBanner(msg) {
    setBanner(msg);
    window.clearTimeout(pushBanner._t);
    pushBanner._t = window.setTimeout(() => setBanner(""), 2000);
  }

  function addMessage(role, text) {
    const m = {
      id: crypto.randomUUID(),
      role,
      ts: nowTs(),
      text: String(text || "").trim()
    };
    setMessages((prev) => [...prev, m]);
  }

  function summarizeCaseForGuidance(c) {
    if (!c) return "No case selected yet.";
    const j = c.jurisdiction || {};
    const caseNo = (c.caseNumber || "").trim();
    const hearing = (c.hearingDate || "").trim()
      ? `${c.hearingDate}${(c.hearingTime || "").trim() ? ` at ${c.hearingTime}` : ""}`
      : "";

    return [
      `Role: ${c.role === "defendant" ? "Defendant" : "Plaintiff"}`,
      `Category: ${c.category || "(not set)"}`,
      `County/Court: ${(j.county || "(not set)")} — ${(j.courtName || "(not set)")}`,
      `Case #: ${caseNo || "(not set)"}`,
      `Hearing: ${hearing || "(not set)"}`,
      `Documents uploaded: ${docs.length}`
    ].join("\n");
  }

  function generateAssistantReply(userText, c) {
    const t = (userText || "").toLowerCase();

    if (!caseId) {
      return "Select a case first (or start a new case). Then I can guide steps based on what’s stored for that case.";
    }

    // Quick commands (deterministic)
    if (t.includes("summary") || t.includes("summarize") || t.includes("case overview")) {
      return `Here is your current case snapshot:\n\n${summarizeCaseForGuidance(c)}\n\nTell me what you want to work on next: intake facts, documents, or filing steps.`;
    }

    if (t.includes("what's missing") || t.includes("whats missing") || t.includes("missing")) {
      const missing = [];
      if (!(c?.caseNumber || "").trim()) missing.push("Case number");
      if (!(c?.hearingDate || "").trim()) missing.push("Hearing date");
      if (docs.length === 0) missing.push("At least one supporting document (contract/receipt/messages/etc.)");

      if (missing.length === 0) {
        return "Nothing critical is missing for a basic v1 packet. Next: tighten your intake facts and confirm your documents support your key points.";
      }
      return `Top missing items right now:\n- ${missing.join("\n- ")}\n\nIf you want, tell me what you’re filing and I’ll suggest the next best step.`;
    }

    if (t.includes("next steps") || t.includes("what next") || t.includes("what should i do")) {
      return [
        "Suggested next steps (v1):",
        "1) Intake: ensure your fact summary is clear and chronological.",
        "2) Documents: upload your key proof (contract/receipt/messages/photos).",
        "3) Preview Packet: confirm the narrative and exhibit list read cleanly.",
        "4) Filing Guidance: confirm where/how to file and service requirements.",
        "",
        "If you tell me your case category and what happened in 2–3 sentences, I’ll suggest what to upload and what to emphasize."
      ].join("\n");
    }

    // Default response for now (until LLM is connected)
    return [
      "I’m not connected to the AI engine yet, but I can still help you structure your case.",
      "Try one of these:",
      "- Type “summary” for a snapshot",
      "- Type “what’s missing” to see gaps",
      "- Type “next steps” for a checklist",
      "",
      "Or paste your short fact pattern and I’ll suggest how to organize it for small claims."
    ].join("\n");
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;

    addMessage("user", text);
    setInput("");

    const reply = generateAssistantReply(text, selectedCase);
    addMessage("assistant", reply);
  }

  const wrap = {
    border: "1px solid #e6e6e6",
    borderRadius: "14px",
    background: "#fff",
    maxWidth: "980px",
    padding: "14px",
    fontFamily: "system-ui, sans-serif"
  };

  const small = { fontSize: "12px", color: "#666" };

  return (
    <div style={wrap}>
      {banner ? (
        <div
          style={{
            marginBottom: "10px",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "#e8f5e9",
            border: "1px solid #c8e6c9",
            fontWeight: 800
          }}
        >
          {banner}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: "16px" }}>AI Assistant</div>
          <div style={small}>
            v1 scaffold (no AI model connected yet). Your chat is saved locally per case in this browser.
          </div>
        </div>

        <div style={{ minWidth: "280px" }}>
          <div style={{ fontWeight: 900, fontSize: "12px" }}>Case</div>
          <select
            value={caseId}
            onChange={(e) => {
              setCaseId(e.target.value);
              pushBanner("Case selection saved.");
            }}
            style={{
              width: "100%",
              marginTop: "6px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: "13px"
            }}
          >
            <option value="">Select a case…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.jurisdiction?.county || "Unknown County")} — {c.role === "defendant" ? "Def" : "Pl"} —{" "}
                {(c.category || "Case")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "12px", background: "#fafafa", border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, marginBottom: "6px" }}>Disclaimer</div>
        <div style={{ fontSize: "13px", color: "#444" }}>
          This tool provides general information and drafting assistance — not legal advice. You control what gets filed.
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          marginTop: "12px",
          height: "340px",
          overflow: "auto",
          border: "1px solid #eee",
          borderRadius: "12px",
          padding: "10px",
          background: "#fff"
        }}
      >
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: "10px" }}>
            <div style={{ fontWeight: 900, fontSize: "12px", color: m.role === "user" ? "#222" : "#444" }}>
              {m.role === "user" ? "You" : "Assistant"}{" "}
              <span style={{ fontWeight: 600, color: "#777" }}>
                — {new Date(m.ts).toLocaleString()}
              </span>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "#222", marginTop: "4px" }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "summary", "what’s missing", or "next steps"…'
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          style={{
            flex: 1,
            padding: "12px 12px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            fontSize: "14px"
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          style={{
            border: "1px solid #ddd",
            background: "#111",
            color: "#fff",
            borderRadius: "12px",
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          Send
        </button>
      </div>

      <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm("Clear chat history for this case (in this browser)?");
            if (!ok) return;
            localStorage.removeItem(storageKey(caseId));
            setMessages([
              {
                id: crypto.randomUUID(),
                role: "assistant",
                ts: nowTs(),
                text:
                  "Chat cleared. Type “summary” to regenerate a snapshot or “next steps” to get a checklist."
              }
            ]);
            pushBanner("Chat cleared.");
          }}
          style={{
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: "12px",
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          Clear Chat
        </button>

        <button
          type="button"
          onClick={() => {
            addMessage("assistant", `Case snapshot:\n\n${summarizeCaseForGuidance(selectedCase)}`);
            pushBanner("Snapshot added.");
          }}
          style={{
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: "12px",
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          Insert Snapshot
        </button>
      </div>
    </div>
  );
}
