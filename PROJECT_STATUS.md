<!-- Path: /PROJECT_STATUS.md -->

# THOXIE / Thoxie-v1 — Project Status

Last updated: 2026-02-18

## Current state (verified in repo)
- Next.js 14.2.5 builds successfully when imports are correct.
- **Vercel deploy is stable** (recent commits deployed without failures).
- **Chat UI is visible and closable**:
  - Dock UI: `src/components/GlobalChatboxDock.js`
  - Main chat UI: `src/components/AIChatbox.js`
- `/api/chat` exists and is the main orchestration endpoint:
  - File: `app/api/chat/route.js`
  - Behavior:
    - Gatekeeper runs first (keeps THOXIE on CA small claims)
    - Readiness Engine is available via intent triggers (“what’s missing”, “am I ready”, etc.)
    - If OpenAI env vars are missing → deterministic safe response (no crash)
    - If OpenAI is enabled → calls OpenAI Chat Completions

## Jurisdiction status (CA)
- County/court dropdown is driven by:
  - `app/_config/jurisdictions/ca.js`
- San Diego County is included with 4 primary venues (Central/Vista/El Cajon/Chula Vista).
- Counties are alphabetized; Los Angeles removed (intentional, for now).

## Readiness Engine (deterministic, server-authoritative)
- Files:
  - `app/_lib/readiness/caSmallClaimsReadiness.js`
  - `app/_lib/readiness/readinessResponses.js`
- Purpose:
  - Produces readiness score + missing required/recommended + ordered next actions.
  - Works without OpenAI.
  - Serves as the “truth layer” for later AI.

## RAG Phase-1 scaffold (exists; optional to test now)
- Files:
  - `app/_lib/rag/*`
  - `app/api/rag/ingest/route.js`
  - `app/api/rag/status/route.js`
- UI support:
  - `src/components/AIChatbox.js` includes a **Sync Docs** button (client→server indexing scaffold).
- Note:
  - Phase-1 extraction is best-effort (text-like only) pending PDF/DOCX parsers.

## Known fragility points (still true)
- Import path drift between:
  - `app/_components/...` vs `src/components/...`
- Duplicate layouts:
  - `app/layout.tsx` and `app/layout.js` both exist.
  - Any global UI change must intentionally target the active layout.

## Immediate next objective (Priority 1)
### Connect OpenAI safely for beta (without breaking guardrails)
- Confirm env var strategy for Vercel:
  - `THOXIE_AI_PROVIDER=openai`
  - `THOXIE_OPENAI_API_KEY=...`
  - `THOXIE_OPENAI_MODEL=...` (optional)
- Add server-side protections before/with enablement:
  1) Prompt-injection defense / system instruction locking
  2) Output constraints (stay CA small claims; refuse off-topic; no legal advice)
  3) Logging hooks (minimal audit trail)

## How we will work next session (must follow)
- You (Paul) prefer **full-file overwrites** in the GitHub repo.
- Use “GitHub Terminal” only when necessary (commands, not code pastes).
- One change batch at a time (usually 3 files), then deploy, then verify.


