<!-- Path: /PROJECT_STATUS.md -->

# THOXIE-v1 — Project Status (CA Small Claims Beta)

## Current Mode
- **Beta size:** 10–20 users
- **Scope:** California Small Claims only
- **Storage:** Local-first (browser) for beta
- **No e-filing** in v1 beta (guidance + printable steps only)

## Deploy / Build
- Deployed successfully on Vercel
- Next.js App Router project

## Implemented (Current Repo Reality)
### Case Flow
- Intake Wizard saves/updates **Case** records and routes into case-scoped pages using `?caseId=...`
- Case Dashboard supports:
  - **Case List** view (`/case-dashboard`)
  - **Case Hub** view (`/case-dashboard?caseId=...`) with:
    - Documents count
    - Next Actions checklist
    - Case Summary
    - Links to Documents / Intake / Filing Guidance / Key Dates

### Evidence / Documents
- DocumentRepository exists (IndexedDB)
- Documents pipeline is **case-scoped**:
  - Upload / list / delete / open
  - Metadata + citation helper scaffolding
  - Stored in browser (IndexedDB)

### UI Refactor Discipline (in progress)
- Case Hub UI components extracted under:
  - `/app/case-dashboard/_components/*`
- Next Actions UI extracted into:
  - `NextActionsCard` + `NextActionsList`

## Beta Cutline (In Scope Now)
- Case intake → case record created
- Evidence upload → stored locally per case
- Evidence list → manage/delete/open
- Dashboard hub (per case) with next steps
- Filing guidance checklist (config-driven CA target)
- Minimal AI drafting (after guidance is stable)

## Out of Scope for Beta (Explicit)
- E-filing or court integrations
- Real-time collaboration / multi-device sync
- Server-side storage requirements
- Auth/accounts (unless explicitly added later)
- Payments/subscriptions
- Advanced OCR / full PDF parsing (allowed later as incremental)

## Future / Not Required For Beta
- Repo includes Postgres-related code/deps (e.g., `pg`, `DATABASE_URL` patterns)
- **Not required for the beta path** unless we explicitly switch to DB-backed persistence

## Next Objective (when you resume)
- Implement/upgrade **Filing Guidance** as a printable, CA-config-driven checklist
- Then: Draft model + minimal AI “Generate Draft” action (local-first)

