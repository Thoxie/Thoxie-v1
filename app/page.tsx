// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCaseStore } from "@/lib/caseStore";
import { CA_COUNTIES } from "@/lib/caCounties";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "thoxie_familylaw_chat_v1";

function formatCurrencyUSD(n: number) {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function HomePage() {
  const caseStore = useCaseStore();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Intake state
  const [county, setCounty] = useState(caseStore.county || "San Mateo");
  const [caseStage, setCaseStage] = useState(caseStore.caseStage || "Early / just starting");
  const [children, setChildren] = useState(caseStore.children ?? "No");
  const [marriageYears, setMarriageYears] = useState(caseStore.marriageYears ?? "");
  const [petitioner, setPetitioner] = useState(caseStore.petitioner ?? "Not sure");
  const [income, setIncome] = useState(caseStore.income ?? "");
  const [assetsApprox, setAssetsApprox] = useState(caseStore.assetsApprox ?? "");
  const [priority, setPriority] = useState(caseStore.priority ?? "Protect assets / fair division");
  const [notes, setNotes] = useState(caseStore.notes ?? "");

  const counties = useMemo(() => CA_COUNTIES, []);

  useEffect(() => {
    // Load chat history
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Persist chat history
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    // persist intake to store
    caseStore.setCounty(county);
    caseStore.setCaseStage(caseStage);
    caseStore.setChildren(children);
    caseStore.setMarriageYears(marriageYears);
    caseStore.setPetitioner(petitioner);
    caseStore.setIncome(income);
    caseStore.setAssetsApprox(assetsApprox);
    caseStore.setPriority(priority);
    caseStore.setNotes(notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [county, caseStage, children, marriageYears, petitioner, income, assetsApprox, priority, notes]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setApiError(null);
    setIsSending(true);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");

    try {
      const payload = {
        messages: [
          {
            role: "system",
            content:
              "You are THOXIE, a family-law decision-support assistant. Provide practical steps, checklists, and drafting help. Ask clarifying questions when needed. Do not claim to be a lawyer.",
          },
          ...nextMessages.map((m) => ({ role: m.role, content: m.content })),
          {
            role: "system",
            content:
              `Context:\nCounty: ${county}\nStage: ${caseStage}\nChildren: ${children}\nMarriage years: ${marriageYears}\nWho filed: ${petitioner}\nIncome (annual): ${income}\nAssets approx: ${assetsApprox}\nPriority: ${priority}\nNotes: ${notes}`.trim(),
          },
        ],
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Request failed");
      }

      const reply = String(data?.reply ?? "");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setApiError(err?.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setApiError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 18px" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, letterSpacing: "-0.02em" }}>THOXIE</h1>
          <p style={{ margin: "6px 0 0 0", opacity: 0.8 }}>
            Family law decision support — organize, plan, draft, and prepare.
          </p>
        </div>
        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/signup" style={{ textDecoration: "underline" }}>
            Sign up
          </Link>
        </nav>
      </header>

      <section style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
        <div className="card">
          <div className="cardHeader">
            <h2 style={{ margin: 0, fontSize: 18 }}>Case Intake (Family Law)</h2>
            <p style={{ margin: "6px 0 0 0", opacity: 0.75 }}>
              This improves the guidance and checklists. You can keep it approximate.
            </p>
          </div>

          <div className="grid2">
            <label className="field">
              <span>California county</span>
              <select value={county} onChange={(e) => setCounty(e.target.value)}>
                {counties.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Stage</span>
              <select value={caseStage} onChange={(e) => setCaseStage(e.target.value)}>
                <option>Early / just starting</option>
                <option>Filed / awaiting response</option>
                <option>Temporary orders / RFO</option>
                <option>Discovery / disclosures</option>
                <option>Mediation / settlement</option>
                <option>Trial prep</option>
                <option>Post-judgment / enforcement</option>
              </select>
            </label>

            <label className="field">
              <span>Children involved?</span>
              <select value={children} onChange={(e) => setChildren(e.target.value)}>
                <option>No</option>
                <option>Yes</option>
                <option>Not sure</option>
              </select>
            </label>

            <label className="field">
              <span>Years married (approx.)</span>
              <input
                value={marriageYears}
                onChange={(e) => setMarriageYears(e.target.value)}
                placeholder="e.g., 8"
              />
            </label>

            <label className="field">
              <span>Who filed?</span>
              <select value={petitioner} onChange={(e) => setPetitioner(e.target.value)}>
                <option>Me</option>
                <option>The other party</option>
                <option>Not sure</option>
              </select>
            </label>

            <label className="field">
              <span>Household income (annual, approx.)</span>
              <input value={income} onChange={(e) => setIncome(e.target.value)} placeholder="e.g., 180000" />
              <small className="hint">
                Tip: enter a number only. Example: {formatCurrencyUSD(180000)}
              </small>
            </label>

            <label className="field">
              <span>Assets total (approx.)</span>
              <input
                value={assetsApprox}
                onChange={(e) => setAssetsApprox(e.target.value)}
                placeholder="e.g., 1500000"
              />
              <small className="hint">
                Example: {formatCurrencyUSD(1500000)}
              </small>
            </label>

            <label className="field">
              <span>Top priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option>Protect assets / fair division</option>
                <option>Custody / parenting plan</option>
                <option>Support (temporary/permanent)</option>
                <option>Move-out / use of property</option>
                <option>Speed &amp; settlement</option>
                <option>Trial prep</option>
              </select>
            </label>
          </div>

          <label className="field" style={{ marginTop: 12 }}>
            <span>Notes / key facts (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any key facts here..." />
          </label>
        </div>

        <div className="card">
          <div className="cardHeader">
            <h2 style={{ margin: 0, fontSize: 18 }}>Ask THOXIE</h2>
            <p style={{ margin: "6px 0 0 0", opacity: 0.75 }}>
              Ask for checklists, draft language, strategy options, or what to do next.
            </p>
          </div>

          <div className="chatWindow">
            {messages.length === 0 ? (
              <div className="chatEmpty">
                <p style={{ margin: 0, opacity: 0.8 }}>
                  Examples:
                </p>
                <ul style={{ marginTop: 10 }}>
                  <li>“Give me a checklist for responding to a divorce petition in California.”</li>
                  <li>“Draft a declaration outline for temporary orders.”</li>
                  <li>“What should I gather for financial disclosures?”</li>
                </ul>
              </div>
            ) : (
              <div className="chatMessages">
                {messages.map((m, idx) => (
                  <div key={idx} className={`msg ${m.role === "user" ? "user" : "assistant"}`}>
                    <div className="msgRole">{m.role === "user" ? "You" : "THOXIE"}</div>
                    <div className="msgContent">{m.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {apiError ? <div className="error">{apiError}</div> : null}

          <div className="chatInputRow">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isSending}
            />
            <button onClick={sendMessage} disabled={isSending || !input.trim()}>
              {isSending ? "Sending…" : "Send"}
            </button>
            <button onClick={resetChat} className="secondary" type="button">
              Reset
            </button>
          </div>

          <p className="footerNote">
            THOXIE provides decision support and drafting assistance — it is not a law firm and does not provide legal
            advice.
          </p>
        </div>
      </section>
    </main>
  );
}


