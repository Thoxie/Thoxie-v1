<!-- Path: /PROJECT_STATUS.md -->

# THOXIE / Thoxie-v1 — Project Status

Last updated: 2026-02-19

## Current state (verified)
### Build / deploy
- Next.js **14.2.35** (upgraded for security)
- Node **20.x** recommended for local/Codespaces work (Next requires Node >= 18.17; we standardized on Node 20)
- Vercel deploy **stable** and currently **answers via OpenAI** when API key is valid

### Chat system (production)
- Chat UI visible + closable
  - `src/components/GlobalChatboxDock.js`
  - `src/components/AIChatbox.js`
- API route present and working
  - `app/api/chat/route.js`
- Behavior:
  - Domain gatekeeper (CA small claims only)
  - Readiness mode supported (“what’s missing” / readiness intent)
  - Phase-1 RAG keyword retrieval scaffold (snippets)
  - OpenAI mode enabled when env vars are set
  - Graceful fallback with a clear reason string when OpenAI fails (e.g., quota/billing/timeout)

## Vercel environment variables (required)
Set in Vercel Project → Settings → Environment Variables (Key/Value).

Required:
- `THOXIE_AI_PROVIDER` = `openai`
- `THOXIE_OPENAI_API_KEY` = `<secret>`

Recommended:
- `THOXIE_OPENAI_MODEL` = `gpt-4o-mini` (or desired model)
- `THOXIE_OPENAI_TIMEOUT_MS` = `20000` (20s)

Notes:
- Do NOT paste `process.env...` into Vercel “Key” — keys must be plain names like `THOXIE_OPENAI_API_KEY`.
- If OpenAI quota/billing is not enabled, API replies will fall back and show the provider error reason.

## Scope freeze (beta)
The v1 beta scope is frozen in:
- `PROJECT_SPECIFICATION.md`
and locked by:
- `BETA_FREEZE_LOCK.md`

## Next development focus (lowest risk)
1) Server-side safety hardening (scope enforcement, injection resistance, refusal consistency)
2) Reliability hardening (timeouts, error messages, optional minimal server logging without secrets)
3) UI readability improvements (font size) — lower priority than safety/reliability

## Do not do without explicit approval
- Major refactors
- Multi-state expansion
- Full RAG ingestion overhaul
- Removing existing functionality

