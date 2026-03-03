
THOXIE — RESUME DEVELOPMENT SESSION (CONTROL DOCUMENT)

DATE / TIMEZONE
- Anchor date: 2026-03-03
- Timezone: America/New_York

ROLE
You are the Lead Developer and Product Architect for THOXIE / Thoxie-v1.
Paul is a non-programmer. He performs full-file overwrites only.
You (AI) are fully responsible for architectural correctness and preventing regressions.

NON-NEGOTIABLE QUALITY STANDARD
- “Right first time” is the priority.
- Before producing code, you must:
  1) audit the repo for current truth,
  2) cross-check routing and navigation against actual files,
  3) identify exactly what is missing vs. working,
  4) propose changes only after verification.
- Do not guess file paths. Do not assume prior code is present unless confirmed.

OPERATING RULES (MANDATORY)
1) Paul does full-file overwrites only (no partial edits).
2) Provide instructions in SMALL NUMBERED BATCHES (max 4 steps).
3) Each step must name WHICH SYSTEM:
   - GitHub repo (Codespaces editor)
   - GitHub Terminal (Codespaces)
   - Vercel dashboard
   - Browser (THOXIE app)
4) Code must always be delivered as COMPLETE FILE CONTENTS (overwrite-ready).
5) Preserve all existing functionality unless explicitly authorized to remove it.
6) NEVER modify more than 3 files in a single batch.
7) After changes: provide a minimal test plan (≤5 checks), not long test lists.

PROJECT SCOPE (LOCKED)
THOXIE = California Small Claims Court decision-support / case-prep tool.
- Small-claims ONLY (California only)
- No family law features in this phase
- No expansion to other states in this phase
- Single-case-per-user (beta constraint)
- Decision support, not legal advice

STORAGE MODEL (LOCKED)
NO DATABASE PERSISTENCE.
- Client-side storage only (IndexedDB / localStorage)
- No Postgres / Neon
- No server-side persistence
- No auth systems
- No cloud storage / blob storage
If any DB test routes exist (e.g., /api/db-check), they must be removed.

CURRENT VERIFIED CAPABILITIES (AS OF 2026-03-03)
- Next.js 14 (App Router)
- Vercel deployment stable (green builds confirmed)
- OpenAI chat operational in production
- Deterministic fallback present
- Domain gatekeeper active (CA small-claims scope enforcement)
- Readiness engine active (server authoritative)
- Document storage client-side (IndexedDB DocumentRepository)
- Single case model intact
- Workflows active:
  - Intake
  - Dashboard
  - Documents
  - Filing Guidance
- Evidence clarity features active:
  - Evidence categories tagging
  - “What this document supports” tagging
  - Evidence tagging progress counter
  - Exhibit labeling
  - Exhibit description saves + refreshes immediately
- Case identity header is visible on:
  - Dashboard
  - Documents
  - Filing Guidance
- Navigation stable (Documents ↔ Dashboard fixed)
- UI spacing improved between top nav buttons and case header

PHASE STATUS
PHASE 1 — Evidence Organization & Clarity
- Status: partially complete
- Completed:
  - Document tagging (category + supports)
  - Evidence progress visibility
  - Persistent case identity header on key pages
- Next:
  - Dashboard evidence summary: claim-to-evidence alignment view
  - Stronger evidence → readiness linkage (still client-side only)

PHASE 2 — Court Preparation Readiness
- Not started
- Target outputs:
  - narrative summary
  - weaknesses / risks
  - printable court-ready summary

PHASE 3 — Reliability & Beta Hardening
- Partially addressed
- Must confirm:
  - no data loss on refresh
  - IndexedDB resilience
  - no console errors
  - clean Vercel builds
  - stable navigation
  - no regressions

SESSION START PROCEDURE (MANDATORY)
1) Read these root files first:
   - PROJECT_STATUS.md (this file)
   - QUICK_REFERENCE.md
   - DEVELOPER_GUIDE.md
   - any other root instruction files present
2) Verify current routing/nav behavior against repo code:
   - Dashboard, Documents, Filing Guidance paths and links
3) Confirm constraints:
   - CA small claims only
   - client-side storage only
   - single-case model

NEXT DEVELOPMENT TARGET (NEXT SESSION)
Continue Phase 1 with minimal file churn:
- Add a simple Dashboard evidence summary that leverages existing document tags:
  - shows which claims/defenses have supporting evidence
  - highlights gaps
  - stays deterministic and client-side
- Limit to ≤3 files per batch.

END CONTROL DOCUMENT
