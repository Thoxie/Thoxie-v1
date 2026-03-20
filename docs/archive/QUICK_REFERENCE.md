THOXIE QUICK REFERENCE (BETA)

Baseline constraints
- California small claims only.
- Client-side persistence only (IndexedDB/localStorage).
- No auth. No database. No cloud storage.

Safety rules (how we work)
- Paul does full-file overwrites only.
- AI must provide complete overwrite-ready file contents.
- One step at a time: give Step 1, wait for output, then decide Step 2.
- Max 3 files changed per batch.

Node / tooling (critical)
- Repo + Vercel require Node 20.x.
- If Codespaces terminal shows Node 24+ (node -v), do NOT proceed with installs/builds.
- Always correct Node first (nvm install 20; nvm use 20), then install/build.

Known pitfalls from the prior session
- Vercel failures occurred because Vercel builds only what’s committed.
  If pdf-parse / tesseract.js / mammoth aren’t in committed dependencies + lockfile, Vercel will say “Module not found”.
- pdf-parse import shape is not stable across bundlers.
  Do not assume default export; code must handle function export vs default export safely.
- XLSX/Excel support is excluded from beta (security/audit concerns).

Current “must ship” UX additions (next session)
1) Delete document icon on each uploaded document row
   - Must remove from IndexedDB
   - Must update UI immediately
2) Reset case button (clear case + clear docs)
   - Must allow re-testing without external accounts/logins

Minimal build check (when asked)
- Codespaces terminal: node -v (must be v20.x)
- npm run build (must succeed locally)
- Commit package.json + package-lock.json when deps change
- Push to origin/main, then Vercel deploy should build what was committed
