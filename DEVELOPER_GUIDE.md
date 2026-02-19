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
Required keys:
- `THOXIE_AI_PROVIDER` = `openai`
- `THOXIE_OPENAI_API_KEY` = `<secret>`

Recommended keys:
- `THOXIE_OPENAI_MODEL` = `gpt-4o-mini`
- `THOXIE_OPENAI_TIMEOUT_MS` = `20000`

Important:
- In Vercel, the left field is **Key** (variable name) and the right field is **Value**.
- Do NOT include `process.env.` in the Key.

## 4) Production debugging standard
When chat fails, classify first:
- If user sees deterministic fallback + “AI temporarily unavailable … Reason: …”
  - OpenAI provider issue (billing/quota/timeout)
- If user sees “No server reply received”
  - inspect Browser DevTools:
    - Network → look for `/api/chat`
    - Console → capture red errors
  - then inspect Vercel function logs for `/api/chat`

## 5) Placeholder files
Paul may create directories by adding:
- `placeholder.txt`

Keep a running list and delete placeholders once the real files exist.

## 6) Definition of done (for any change)
- Deploy succeeds on Vercel
- Production test passes:
  - `https://thoxie-v1.vercel.app/case-dashboard`
  - contractor evidence question returns substantive answer
- No regressions in readiness mode (“what’s missing”)
- No scope creep (CA small claims only)


