<!-- Path: /QUICK_REFERENCE.md -->

# THOXIE / Thoxie-v1 — Quick Reference

Last updated: 2026-02-19

## Current state (verified)
### Build / deploy
- Next.js **14.2.35**
- Node **20.x** recommended for local/Codespaces
- Vercel deploy is stable

### Chat system (production)
- UI:
  - `src/components/GlobalChatboxDock.js`
  - `src/components/AIChatbox.js`
- API:
  - `app/api/chat/route.js`

### Expected routing behavior (product intent)
- **Deterministic**:
  - Out-of-scope refusals (non-CA / non-small-claims)
  - Beta restricted (403)
  - Rate limited (429)
  - Kill switch disabled mode
  - Readiness evaluation **only when explicitly requested**
- **OpenAI default**:
  - In-scope legal guidance questions (elements, proof, evidence checklist, filing steps, risks, follow-ups)
- Readiness must **not** hijack normal legal questions (avoid broad triggers like the word “checklist”).

## Vercel environment variables (Key/Value)
Set in Vercel Project → Settings → Environment Variables.

### Required (AI on)
- `THOXIE_AI_PROVIDER` = `openai`
- `THOXIE_OPENAI_API_KEY` = `<secret>`

### Recommended (quality + reliability)
- `THOXIE_OPENAI_MODEL` = `gpt-4o-mini`
- `THOXIE_OPENAI_TIMEOUT_MS` = `20000`

### Beta hardening (when enabled)
- `THOXIE_AI_KILL_SWITCH` = `0` (AI ON) or `1` (AI OFF)
- `THOXIE_BETA_ALLOWLIST` = `paul@yourdomain.com` (or comma-separated list)
- Rate limit keys vary by implementation, but goal is:
  - per-minute cap with 429 response and “wait X seconds” message

### Admin notifications (must implement next)
- `THOXIE_ADMIN_WEBHOOK_URL` = `<Zapier/Make webhook URL>`
- Optional: `THOXIE_ADMIN_WEBHOOK_ENABLED` = `1`

Webhook triggers:
- 403 beta restricted
- 429 rate limited
Payload must exclude message content (metadata only).

## Document access (major next milestone)
Current:
- Client-side IndexedDB document storage
- “Sync Docs” Phase-1 RAG scaffold

Missing:
- PDF/DOCX text extraction
- Indexing extracted text with citations (doc name + chunk id)
- Evidence-aware prompting that cites snippets

Constraints:
- Minimal changes per iteration
- Avoid heavy infrastructure
- Preserve client-side storage

## Do not do without explicit approval
- Major refactors
- Multi-state expansion
- Heavy auth stacks
- Full analytics platforms

