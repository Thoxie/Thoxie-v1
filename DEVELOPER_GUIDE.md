<!-- Path: /DEVELOPER_GUIDE.md -->

# THOXIE / Thoxie-v1 — Developer Guide (operating rules)

## 1) Ground rules (how we avoid wasted hours)
1. **No guessing paths.** Before any step, verify existence:
   - `ls -la <dir>`
2. **One change = one verification.**
   - After each overwrite: `npm run build`
3. **No code pasted into terminal** unless it is a heredoc overwrite command you explicitly chose to run.
   - Preferred: overwrite files directly in the repo/editor.
4. **Path headers**
   - Allowed in code files ONLY if commented.
   - Must match real file path.
   - Never placed in JSON/YAML.

## 2) Where changes should happen
- Primary: GitHub repo file edits (or Codespaces editor UI).
- Terminal: commands only (npm, git, ls, sed, cat, grep, curl).

## 3) AI chat architecture (current target)
### API
- `app/api/chat/route.js`
  - Accepts `{ caseId?, mode?, prompt?, messages? }`
  - Returns `{ ok, usedLiveModel, reply:{role,content}, ... }`
  - Must not crash when env vars are missing.

### Server config
- `app/_lib/ai/server/aiConfig.js`
  - Reads env vars safely.
  - Exposes:
    - `getAIConfig()`
    - `isLiveAIEnabled(cfg)`

### Client helper
- `app/_lib/ai/client/sendChat.js`
  - Calls `/api/chat`
  - Returns JSON response

### UI
- Dock (floating launcher):
  - `src/components/GlobalChatboxDock.js`
- Main chat UI:
  - `src/components/AIChatbox.js`
- Simple test component:
  - `app/_components/ai/ChatBox.jsx`
- Test page:
  - `app/ai-test/page.jsx`

## 4) “Chatbox not showing” checklist
1. Confirm layout includes dock:
   - `app/layout.tsx` OR `app/layout.js` must render `<GlobalChatboxDock />`
2. Confirm import path is correct for whichever dock you are using:
   - If importing from `src/components`, use:
     - `import GlobalChatboxDock from "../src/components/GlobalChatboxDock";`
3. Confirm dev server is running:
   - `npm run dev`
4. Open via Codespaces Ports tab (3000).

## 5) Git sync rule (avoid pull conflicts)
If `git pull` complains about local changes:
1. `git stash push -u -m "WIP before sync"`
2. `git pull`
3. Only then re-apply changes if needed:
   - `git stash list`
   - `git stash pop` (only if you intentionally want those local changes back)

