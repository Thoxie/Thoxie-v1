<!-- PATH: /CURRENT_STATE.md -->
<!-- DIRECTORY: / -->
<!-- FILE: CURRENT_STATE.md -->
<!-- ACTION: OVERWRITE -->

# THOXIE — CURRENT STATE

This file is the current cleanup-oriented handoff for the repo.

## Product reality

- THOXIE is server-backed
- The root Next.js app is the canonical product
- Uses PostgreSQL for case/document/chunk data
- Uses Vercel Blob for uploaded file storage
- The document ingestion / extraction / retrieval pipeline is real and should be preserved
- The repo still contains legacy/prototype material that should not be treated as the active product by default

## What changed in development direction

The repo is no longer being treated as an OCR-first debugging problem.

Cleanup and normalization are now the primary priority.

The main risks are currently:

- route drift
- state authority drift
- duplicate legacy flows
- outdated root documentation
- oversized document payload behavior
- lack of normalization between list/detail document loading

## What was reported deployed this session

The following files were reported deployed to Vercel:

### Batch 2
- `/app/case-dashboard/CaseHub.js`
- `/app/documents/page.js`
- `/app/filing-guidance/page.js`

### Batch 3
- `/app/document-preview/page.js`
- `/app/filing-guidance/print/page.js`
- `/app/key-dates/page.js`

These deployments should still be verified against the current GitHub file contents before additional cleanup work is generated.

## What was not applied

Batch 4 was **not** applied.

The proposed overwrite for:

- `/app/dashboard/page.js`

caused a Vercel error and must be redesigned after inspecting the actual current file contents and, if available, the exact Vercel build complaint.

Because Batch 4 was not applied, the following cleanup work should still be considered pending until verified otherwise:

- `/app/dashboard/page.js`
- `/app/_repository/documentRepository.js`
- `/app/api/documents/route.js`

## What still must be verified

The deployment status of the earlier Batch 1 is not confirmed from session history and must be verified from the current GitHub versions of:

- `/app/_repository/caseRepository.js`
- `/app/start/page.js`
- `/app/api/case/load/route.js`

Do not assume Batch 1 is live until those current file contents are inspected.

## Highest-priority cleanup issues

1. The legacy `/dashboard` route still represents obsolete localStorage-era logic and should be retired safely in favor of the real `/case-dashboard` path.
2. Batch 1 status is uncertain, so the case lifecycle fixes around start/create/load must be verified before more route work is stacked on top.
3. The document list/detail contract still needs cleanup unless current GitHub files already contain those changes.
4. The client/server chat-document boundary still likely sends more document text than necessary.
5. Root handoff documentation had drifted toward OCR-only debugging and needed re-centering on repo cleanup.

## Current safe roadmap

1. Verify current GitHub versions of the Batch 1 and Batch 4 target files
2. Rework the `/dashboard` cleanup in a Vercel-safe way
3. Resume document repository / document API normalization
4. Then reduce chat/document payload duplication
5. Then move to security / ownership hardening

## Important rule for the next session

Do not treat older OCR-focused notes or earlier generated prompts as the governing development plan.

The cleanup roadmap above is the governing plan unless the current code proves otherwise.
