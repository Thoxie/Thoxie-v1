<!-- Path: /DEVELOPER_GUIDE.md -->

# THOXIE / Thoxie-v1 — Developer Guide (Operating Rules)

This file defines how we work (to avoid regressions) and what “done” means.

## 1) Ground rules (hard)
1) No guessing paths. Confirm file path before overwrite.
2) Paul does full-file overwrites only (no partial edits).
3) Give instructions in batches of up to 4 steps.
4) Each step must state the system:
   - GitHub (Codespaces editor)
   - GitHub Terminal (Codespaces)
   - Vercel dashboard
   - Browser (THOXIE app)
5) Never remove functionality without stating the reason and getting explicit approval.
6) Never modify more than 3 files in a single batch.
7) AI is responsible for architectural correctness. Do not delegate design decisions to Paul.

## 2) Locked scope
- California small claims only
- Single case per user
- Client-side storage only (IndexedDB/localStorage)
- No database persistence
- No cloud storage
- No family law
- No multi-state expansion

## 3) Node / Next
- Next.js 14 App Router
- Node pinned via `.nvmrc` (20.20.0)

## 4) Definition of Done (for any change)
- Vercel deploy succeeds (green)
- Navigation works as expected (Dashboard / Documents / Filing Guidance)
- Evidence tags persist
- No console errors
- No regressions in existing workflows
- Scope constraints remain intact

## 5) Minimal manual test (≤5 checks)
1) Dashboard loads and shows case identity header
2) Documents loads with case identity header; upload works; tags persist
3) Filing Guidance loads with case identity header; buttons work
4) Navigation: Documents → Back to Dashboard works
5) Vercel build is green

