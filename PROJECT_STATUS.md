<!-- Path: /PROJECT_STATUS.md -->

# THOXIE / Thoxie-v1 — Project Status

Last updated: 2026-02-18

## Current state (verified)
- Next.js 14.2.5 builds successfully when imports are correct.
- `/api/chat` endpoint exists:
  - File: `app/api/chat/route.js`
  - Behavior:
    - If env vars missing → placeholder response (no crash)
    - If enabled → calls OpenAI Chat Completions endpoint
- Chat UI components exist:
  - Dock UI: `src/components/GlobalChatboxDock.js`
  - Main chat UI: `src/components/AIChatbox.js`
  - Test chat component: `app/_components/ai/ChatBox.jsx`
  - Test page: `app/ai-test/page.jsx`

## Known fragility points
- Import path drift between:
  - `app/_components/...` vs `src/components/...`
- Duplicate layouts:
  - `app/layout.tsx` and `app/layout.js` both exist, so changes must be consistent or you must intentionally pick one.

## Immediate next objectives
1. **Single “source of truth” for the dock**
   - Decide whether the dock lives in `src/components/` or `app/_components/`
   - Remove or stop importing the duplicate to prevent future “module not found” regressions.
2. **Wire dock onto every page via layout**
   - Ensure layout renders `<GlobalChatboxDock />`
   - Confirm it appears on `/start` and `/case-dashboard`
3. **End-to-end smoke test**
   - Local: `npm run dev` + open port 3000
   - Confirm sending “ping” returns placeholder or live response based on env vars

## How we will work next session (must follow)
- Step = verify paths with `ls`
- Overwrite one file
- Run `npm run build`
- Only then proceed to next file


