<!-- Path: /QUICK_REFERENCE.md -->

# THOXIE / Thoxie-v1 — Quick Reference (single source of truth)

## Non-negotiable workflow rules
- **Edits happen in GitHub repo files** (or Codespaces editor) — not by pasting JS/TS into the terminal.
- Terminal is for **commands only** (npm, git, ls, cat, sed).
- When we change code, we do **full-file overwrites**.
- Every code file may include a **path header comment**, but it must be:
  - **Commented out**
  - **Accurate** (must match the real path)
  - Never inserted into JSON

## Repo layout (current)
- `app/` = Next.js App Router
  - `app/layout.tsx` and `app/layout.js` exist
  - `app/api/chat/route.js` = main chat API endpoint
  - `app/_lib/ai/server/aiConfig.js` = server-only AI config + env parsing
  - `app/_lib/ai/client/sendChat.js` = client helper used by chat UI
  - `app/_components/ai/ChatBox.jsx` = simple test chat UI component
- `src/components/`
  - `src/components/AIChatbox.js` = main chat UI used by the dock
  - `src/components/GlobalChatboxDock.js` = floating dock UI

## Canonical AI endpoints (do not duplicate)
- **Client calls:** `POST /api/chat`
  - File: `app/api/chat/route.js`
- **Optional internal:** `app/ai/chat/route.js` (only if you intentionally want a non-API route; otherwise remove later)

## Environment variables (Vercel + local)
- `THOXIE_AI_PROVIDER=openai`
- `THOXIE_OPENAI_API_KEY=...`
- Optional: `THOXIE_OPENAI_MODEL=gpt-4o-mini`

If env vars are missing, `/api/chat` should return a **safe placeholder** response (no crash).

## Running locally (Codespaces)
1. Open Codespaces terminal at repo root.
2. Run:
   - `npm install`
   - `npm run dev`
3. Open the app:
   - In Codespaces: go to the **Ports** tab → find **3000** → click **Open in Browser**
   - OR use the “Open in Browser” toast if it appears

Important:
- `npm run build` does NOT start a server.
- You will not see `http://localhost:3000` unless you run `npm run dev`.

## Fast verification commands
- Confirm files exist:
  - `ls -la app/api/chat`
  - `ls -la app/_lib/ai/server`
  - `ls -la src/components`
- Confirm API route compiles:
  - `npm run build`
- Smoke test API locally (after `npm run dev`):
  - `curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"ping"}]}'`

## Common failure causes (what to check first)
- “Module not found” → wrong relative import path (most common)
- “Cannot find module autoprefixer” → missing dependency in package.json (do not hack around it)
- JSON parse error in package.json → you pasted a path header comment into JSON (never do that)

