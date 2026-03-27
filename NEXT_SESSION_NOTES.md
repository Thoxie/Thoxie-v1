<!-- PATH: /NEXT_SESSION_NOTES.md -->
<!-- DIRECTORY: / -->
<!-- FILE: NEXT_SESSION_NOTES.md -->
<!-- ACTION: OVERWRITE -->

# NEXT SESSION NOTES

## Main objective

Continue the cleanup-first roadmap.

Do **not** pivot back to OCR-first debugging as the main plan until the route/state/API cleanup baseline is stabilized.

## Important session context

- The root app is the real product.
- The repo contains drift from multiple prior sessions and generated code drops.
- Root markdown files had been overly focused on OCR and were lagging behind actual cleanup needs.
- The current priority is cleanup and correction while preserving visible behavior.

## Reported deployment status from the prior session

### Reported deployed
- `/app/case-dashboard/CaseHub.js`
- `/app/documents/page.js`
- `/app/filing-guidance/page.js`
- `/app/document-preview/page.js`
- `/app/filing-guidance/print/page.js`
- `/app/key-dates/page.js`

### Not applied
- `/app/dashboard/page.js`
- `/app/_repository/documentRepository.js`
- `/app/api/documents/route.js`

Batch 4 was not applied because the proposed `app/dashboard/page.js` replacement caused a Vercel error.

### Still unknown / must verify
- `/app/_repository/caseRepository.js`
- `/app/start/page.js`
- `/app/api/case/load/route.js`

The status of those Batch 1 files is not confirmed and must be verified from the current GitHub file contents.

## First tasks next session

Before proposing any new overwrite batch, inspect the current GitHub versions of:

- `/app/_repository/caseRepository.js`
- `/app/start/page.js`
- `/app/api/case/load/route.js`
- `/app/_config/routes.js`
- `/app/case-dashboard/page.js`
- `/app/dashboard/page.js`
- `/app/_repository/documentRepository.js`
- `/app/api/documents/route.js`
- `/README.md`
- `/CURRENT_STATE.md`
- `/NEXT_SESSION_NOTES.md`

If the next-session model does not have the current GitHub versions of the files it plans to edit, it should ask the user to paste or upload those exact files before generating overwrite-ready replacements.

## Likely issue to verify from the failed dashboard attempt

A previous proposed cleanup replaced the large legacy `/app/dashboard/page.js` file with a short redirect shim.

The shrink was intentional because the route is considered obsolete.

However, that replacement failed in Vercel.

Do not assume the previous short file was valid. Inspect the current file and the build requirements before retrying that cleanup.

A shorter replacement is still acceptable if the route is obsolete, but it must be valid for the current Next.js/Vercel setup and the reason for the size reduction should be stated clearly.

## Coding priority order

1. Verify whether Batch 1 is already live.
2. Repair the legacy `/dashboard` route cleanup safely.
   - Goal: retire obsolete localStorage-only dashboard logic
   - Preserve backward compatibility for `/dashboard`
   - Do not change visible UI
3. After the dashboard route is handled, finish document contract cleanup:
   - `/app/_repository/documentRepository.js`
   - `/app/api/documents/route.js`
   Goals:
   - list responses should return preview text, not full extracted bodies
   - full text should be fetched only when actually needed
   - document deletion should use a real checked-out Postgres client transaction
4. Then clean the chat/document boundary so the client stops sending document text the server can already load itself.
5. Then move to security / ownership hardening.

## Hard workflow rules

- Full file overwrites only
- No diff snippets
- No partial edits
- No “replace this section” instructions
- Batches of 3 files maximum
- Every delivered file must include commented headers with:
  - PATH
  - DIRECTORY
  - FILE
  - ACTION
- Present files on screen only
- Do not provide downloadable artifacts
- Preserve existing functionality
- Do not redesign UI
- Do not change the AI chatbot box UI
- When terminal work is used, keep it targeted and grounded in current repo state

## Avoid

- OCR-first debugging as the main plan
- Broad rewrites
- Assuming older handoff markdown is correct without checking current code
- Assuming an obsolete file must stay large just because it was historically large
- Any batch that is generated without first checking the current version of the files being overwritten
