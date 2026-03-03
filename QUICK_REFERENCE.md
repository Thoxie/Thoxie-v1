<!-- Path: /QUICK_REFERENCE.md -->

# THOXIE / Thoxie-v1 — Quick Reference

Last updated: 2026-03-03

## Scope (locked)
- California small claims ONLY
- Single case per user (beta)
- Client-side storage only (IndexedDB / localStorage)
- No database persistence
- No cloud storage
- No family law in this phase
- No multi-state expansion in this phase

## Current state (confirmed)
### Build / deploy
- Next.js 14 App Router
- Node pinned by `.nvmrc` (20.20.0)
- Vercel auto-deploy stable (green builds confirmed)

### Key workflows (working)
- Dashboard
- Start / Edit Intake
- Documents
- Filing Guidance

### Evidence clarity (Phase 1 — partially complete)
- Evidence Category tagging per document
- “What this document supports” tagging per document
- Evidence tagging progress indicator
- Exhibit labeling
- Exhibit description saves and refreshes immediately

### Case identity visibility
- CaseIdentityHeader visible on:
  - Dashboard
  - Documents
  - Filing Guidance

### Navigation stability
- Documents ↔ Dashboard navigation fixed and stable

## Operating rules (non-negotiable)
- Paul does full-file overwrites only
- Provide steps in small batches (≤4 steps)
- Every step names the system (Codespaces editor / terminal / Vercel / browser)
- Never modify more than 3 files per batch
- Preserve working behavior and keep Vercel green

## Do not do without explicit approval
- Database persistence (Postgres/Neon/etc.)
- Auth stacks
- Cloud/Blob storage
- Multi-case support
- Other states/jurisdictions
- Major refactors
