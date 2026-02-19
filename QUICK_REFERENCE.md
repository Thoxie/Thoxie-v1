<!-- Path: /QUICK_REFERENCE.md -->

# THOXIE / Thoxie-v1 — Quick Reference (single source of truth)

## Workflow rules (operational)
- **Edits happen in GitHub repo files** (or Codespaces editor) — not by pasting JS/TS into the terminal.
- Terminal is **commands only** (npm, git, ls, cat).
- When we change code, we do **full-file overwrites**.
- Every instruction must say:
  - Which system: GitHub website vs GitHub Terminal (Codespaces) vs Vercel vs Browser
  - Exactly where to click / what to expect
- User terminology:
  - “GitHub repo” = repo contents
  - “GitHub Terminal” = Codespaces terminal/editor context

## Repo layout (current)
- `app/` = Next.js App Router
  - `app/api/chat/route.js` = main chat API endpoint (gatekeeper + readiness + optional OpenAI)
  - `app/api/rag/ingest/route.js` = Phase-1 RAG ingest scaffold
  - `app/api/rag/status/route.js` = Phase-1 RAG status scaffold
  - `app/_config/jurisdictions/ca.js` = CA county/court list (drives dropdown)
  - `app/_lib/readiness/*` = deterministic readiness engine
  - `app/_lib/rag/*` = Phase-1 retrieval scaffold
- `src/components/`
  - `GlobalChatboxDock.js` = dock wrapper
  - `AIChatbox.js` = chat UI (now visible + closable; includes Sync Docs button)

## Product guardrails (current)
- Domain gatekeeper exists in server AI layer and is invoked by `/api/chat`.
- Intended scope:
  - California small claims only
  - Decision-support only (no legal advice)
  - Off-topic requests must be refused and redirected

## Current state checkpoints (fast)
- Chat visible + closable in production ✅
- San Diego County appears in dropdown ✅
- Readiness prompts return deterministic checklist ✅
- OpenAI connectivity: NOT enabled unless env vars are set ✅

## Next planned step
- Enable OpenAI on Vercel with safety hardening (prompt injection defense + constrained output).

