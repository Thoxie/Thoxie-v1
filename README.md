<!-- PATH: /README.md -->
<!-- DIRECTORY: / -->
<!-- FILE: README.md -->
<!-- ACTION: OVERWRITE -->

# THOXIE (Thoxie-v1)

THOXIE is a server-backed small-claims workflow application with document-grounded AI assistance.

## Source of truth

When documentation conflicts with the current GitHub code or deployed behavior, trust the current code first.

Use this order of authority:

1. Current GitHub file contents / deployed behavior
2. `CURRENT_STATE.md`
3. `NEXT_SESSION_NOTES.md`
4. Older markdown notes and historical prompts

## Canonical app

The root Next.js app is the product.

Treat older nested directories and root HTML mockups as legacy or prototype material unless the current root app explicitly routes to or depends on them.

## Current architecture

- Framework: Next.js App Router
- Product app: root `/app`
- Backend routes: `/app/api`
- Database: PostgreSQL
- File storage: Vercel Blob
- Case/document flow: server-backed
- Document pipeline: ingestion, extracted text storage, chunking, retrieval

## Current development priority

Cleanup and normalization come before new functionality.

The current objective is to preserve the visible product while correcting internal drift, route inconsistencies, and split state behavior.

Do not redesign the UI during this cleanup work.

## Active cleanup themes

- Keep the root app as the only authoritative product surface
- Reduce split-brain behavior between browser-local state and server-backed state
- Normalize route behavior around `/case-dashboard`
- Retire obsolete legacy flows only when replacement behavior is already present
- Tighten the document list/detail API contract
- Reduce stale repo guidance and handoff drift
- Preserve the document ingestion / retrieval pipeline while cleaning the application shell
- Move security / ownership hardening after the state and API cleanup baseline is stable

## Working rules for this repo

- Full file overwrites only
- No diff snippets
- No partial patch instructions
- Deliver files in batches of 3 maximum
- Every delivered file must include commented headers with:
  - PATH
  - DIRECTORY
  - FILE
  - ACTION
- Present file contents on screen only
- If the current GitHub version of a target file may differ from an older zip or local snapshot, inspect the current file before generating an overwrite

## Important UI rule

Do not change the visible UI during cleanup unless the user explicitly asks for it.

This includes preserving the current AI chatbot box UI.

## Immediate next targets

1. Verify the current GitHub state of the Batch 1 files:
   - `/app/_repository/caseRepository.js`
   - `/app/start/page.js`
   - `/app/api/case/load/route.js`
2. Repair the legacy `/dashboard` route cleanup safely after the failed Vercel attempt
3. Finish the document repository / document API cleanup
4. Then clean up the chat/document boundary
5. Then move to security / ownership hardening
