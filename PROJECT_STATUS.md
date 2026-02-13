<!-- Path: /PROJECT_STATUS.md -->

# THOXIE-v1 — Project Status (CA Small Claims Beta)

## Current Mode
- **Beta mode:** 10–20 users
- **Scope:** California Small Claims only
- **Storage:** Local-first (browser) for beta
- **No e-filing** in v1 beta (guidance + printable steps only)

## Deploy / Build
- Deployed successfully on Vercel
- App Router (Next.js)

## Implemented (Current Repo Reality)
- Intake Wizard saves/updates **Case** records and routes into Documents using `?caseId=...`
- Case persistence uses local-first repository patterns
- Documents pipeline exists and is **case-scoped**:
  - Upload / list / delete / open
  - Metadata + “citation helper” scaffolding
  - Stored in browser (IndexedDB)

## Beta Cutline (In Scope Now)
- Case intake → case record created
- Evidence upload → stored locally per case
- Evidence list → manage/delete/open
- Basic dashboard hub (next objective)
- Filing guidance checklist (config-driven, CA)

## Out of Scope for Beta (Explicit)
- E-filing or court integrations
- Real-time collaboration / multi-device sync
- Server-side storage requirements
- Auth/accounts (unless explicitly added later)
- Payment system
- Advanced OCR / full PDF parsing (allowed later as incremental)

## Future / Not Required For Beta
- Repo includes Postgres-related code/deps (e.g., `pg`, `DATABASE_URL` patterns)
- **Not required for the beta path** unless we explicitly switch to DB-backed persistence

## Next Objective
- **Dashboard as hub** (case summary + doc count + next actions)
- **Filing Guidance** (CA config-driven printable checklist)
- Then: minimal AI draft generation contract
