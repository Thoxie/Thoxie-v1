<!-- Path: /DEVELOPER_GUIDE.md -->

# THOXIE / Thoxie-v1 — Developer Guide (operating rules)

This file defines how we work (to avoid wasted cycles) and what “done” means.

## 1) Ground rules
1) **No guessing paths.** Confirm file path before overwrite.
2) Paul does **full-file overwrites** only (no partial edits).
3) Give instructions in **batches of up to 3 steps**.
4) Each step must state the system:
   - GitHub repo (website)
   - GitHub Terminal (Codespaces)
   - Vercel
   - Browser (THOXIE app)
5) Never remove functionality without:
   - stating the reason, and
   - asking permission.

## 2) Codespaces / Node version
- Next.js requires Node >= 18.17.
- Standardize on **Node 20** in Codespaces:
  - `node -v` should show v20.x

## 3) Vercel environment variables (Key/Value)
Required keys (AI on):
- `THOXIE_AI_PROVIDER` = `openai`
- `THOXIE_OPENAI_API_KEY` = `<secret>`

Recommended keys:
- `THOXIE_OPENAI_MODEL` = `gpt-4o-mini`
- `THOXIE_OPENAI_TIMEOUT_MS` = `20000`

Beta hardening keys (when enabled):
- `THOXIE_AI_KILL_SWITCH` = `0` (AI ON) or `1` (AI OFF)
- `THOXIE_BETA_ALLOWLIST` = `email1@example.com,email2@example.com`
- Rate limiting is enforced server-side and returns 429 with wait seconds.

Admin notification keys (next build):
- `THOXIE_ADMIN_WEBHOOK_URL` = `<Zapier/Make webhook URL>`
- Optional: `THOXIE_ADMIN_WEBHOOK_ENABLED` = `1`

Important:
- In Vercel, left field is **Key**, right field is **Value**.
- Do NOT include `process.env.` in the Key.

## 4) Production debugging standard
When chat output is unexpected, classify first:

A) Deterministic readiness template appears:
- Confirm whether the user explicitly asked readiness.
- If not, readiness intent detection is too broad (must be tightened).

B) “Beta access is restricted …” (403)
- TesterId missing or not in allowlist
- Verify `THOXIE_BETA_ALLOWLIST` value and redeploy.

C) “Rate limit reached …” (429)
- Working as designed; verify reset time and optionally notify admin via webhook.

D) Deterministic fallback with reason
- OpenAI provider issue (billing/quota/timeout)
- Inspect Vercel function logs for `/api/chat`

## 5) Placeholder files
Paul may create directories by adding:
- `placeholder.txt`

Keep a running list and delete placeholders once the real files exist.

## 6) Definition of done (for any change)
- Deploy succeeds on Vercel
- Production tests pass (minimal):
  1) In-scope legal question returns OpenAI structured answer
  2) Explicit “what’s missing for filing” returns readiness template
  3) Out-of-scope state/county refuses deterministically
  4) 403/429 behavior correct (and webhook notification if enabled)
- No regressions in UI or routing
- No scope creep (CA small claims only)



