# Thoxie-v1 Status Snapshot (CA Small Claims Beta)

## Build / Deploy
- Next.js (App Router) deployed successfully on Vercel
- Repo builds from project root
- Current release status: stable deployment

## Current Product Scope (Beta: 10–20 users)
- California Small Claims only
- No e-filing (guidance + printable steps only)
- Local-first storage in the browser for beta (IndexedDB)

## Implemented (Confirmed Working)
- Intake Wizard creates/updates a Case record and routes into Documents via `?caseId=...`
- Case persistence: CaseRepository (local-first)
- Document persistence: DocumentRepository (IndexedDB; case-scoped)
- Documents pipeline: upload/list/delete/open/citation helper (case-scoped)

## Not Yet Implemented (Planned Next)
- Case Dashboard as the primary hub (case summary, document counts, next actions)
- Filing Guidance: court-specific checklist pulled from config (CA-only)
- AI draft generation: minimal orchestration contract + Draft model (after dashboard/guidance are stable)

## Data & Storage Plan (Beta)
- Primary storage: IndexedDB (browser)
- Export/sync: not required for beta (future enhancement)

## Server/Database Notes (Future / Not Required for Beta)
- Repo includes `pg` + `/lib/db.ts` and DATABASE_URL support
- These are NOT required for the local-first beta path unless we explicitly switch to DB-backed storage

## Next Objective
- Harden Documents + wire Case Dashboard tiles (documents count, next actions)

