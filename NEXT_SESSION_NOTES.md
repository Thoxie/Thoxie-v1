<!-- Path: /NEXT_SESSION_NOTES.md -->

# THOXIE — NEXT SESSION NOTES
Last Updated: 2026-03-03
Timezone Anchor: America/New_York

---

## CURRENT SYSTEM STATE (VERIFIED)

### Core
- Next.js 14 App Router
- Node 20.20.0 pinned via .nvmrc
- Vercel auto-deploy stable (green builds confirmed)
- No console errors reported

### Scope (LOCKED)
- California Small Claims ONLY
- Single case per user (beta constraint)
- Client-side storage only (IndexedDB / localStorage)
- NO database persistence
- NO Postgres / Neon
- NO cloud storage
- NO auth stack
- NO family law features

### Active Workflows
- Intake
- Dashboard
- Documents
- Filing Guidance

### Evidence System (Phase 1 — Partially Complete)
- Evidence category tagging per document
- “What this document supports” tagging per document
- Evidence tagging progress indicator
- Exhibit lettering
- Exhibit description saves and refreshes immediately
- CaseIdentityHeader visible on:
  - Dashboard
  - Documents
  - Filing Guidance
- Navigation stable (Documents ↔ Dashboard fixed)
- UI spacing between nav buttons and case header reduced

---

## PHASE STATUS

### PHASE 1 — Evidence Organization & Clarity
Status: PARTIALLY COMPLETE

Completed:
- Document tagging (category + supports)
- Evidence progress visibility
- Persistent case identity header across major pages

Remaining:
- Dashboard evidence clarity enhancement:
  - Visual claim-to-evidence alignment summary
  - Clear indication of gaps
  - Deterministic, client-side logic only
- Strengthen evidence → readiness linkage (no automation yet)

No database changes allowed.
No storage model changes allowed.

---

### PHASE 2 — Court Preparation Readiness
Not started.

Future goals:
- Narrative case summary
- Weakness identification
- Structured preparation output
- Printable court-ready summary

Still client-side only.

---

### PHASE 3 — Reliability & Beta Hardening
Partially addressed.

Must confirm:
- No data loss on refresh
- IndexedDB resilience
- No console errors
- Clean Vercel builds
- Stable navigation
- No regressions

---

## OPERATING RULES FOR NEXT SESSION

1. Paul performs FULL FILE OVERWRITES ONLY.
2. Provide instructions in SMALL NUMBERED BATCHES (max 4 steps).
3. Each step must specify the system:
   - GitHub (Codespaces editor)
   - GitHub Terminal (Codespaces)
   - Vercel dashboard
   - Browser (THOXIE app)
4. Never modify more than 3 files in a single batch.
5. Preserve all working functionality.
6. No backend expansion.
7. No database work.
8. AI is fully responsible for architectural correctness.

---

## NEXT DEVELOPMENT TARGET (START HERE)

Continue PHASE 1:

Design and implement a minimal Dashboard evidence summary that:

- Uses existing document tags
- Shows claim/defense coverage
- Highlights gaps clearly
- Requires no database
- Does not alter storage model
- Limits file changes to ≤3 files per batch

Stability and clarity first.
No refactors.
No scope expansion.

---

END NOTES
