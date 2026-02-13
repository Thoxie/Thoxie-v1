<!-- Path: /PROJECT_SPECIFICATION.md -->

# THOXIE-v1 — Beta Freeze Spec (CA Small Claims v1 Beta)

This document is the **architecture + scope freeze** for the THOXIE v1 beta (10–20 users).  
**If it is not listed as “In Scope,” it is out of scope** unless explicitly approved later.

---

## 1) Scope Freeze

### In Scope (Beta)
- California Small Claims (CA-only)
- Plaintiff and Defendant workflows (both supported)
- Jurisdiction-first intake (County → Court)
- Case creation + editing (local-first persistence)
- Evidence/document management (local-first persistence):
  - Upload, list, delete, open/view
  - Metadata fields (type/category, description)
  - Citation scaffolding (filename + optional page placeholder)
- Dashboard hub view (per case):
  - Case summary + documents count
  - “Next actions” checklist tiles
- Filing Guidance (CA config-driven):
  - Court/county steps
  - Printable checklist output
- Minimal AI orchestration (after dashboard/guidance are stable):
  - Generate a draft from case facts + selected evidence text (when available)
  - Store output as a Draft record (local-first)

### Out of Scope (Beta)
- E-filing, integrations with court systems, automated service of process
- User accounts/authentication, multi-device sync, collaboration
- Backend database as required dependency for core flows
- Payments/subscriptions
- Advanced OCR / full PDF extraction pipeline (allowed later as incremental)
- Anything outside California

---

## 2) Data Model Freeze (Identifiers + Fields)

### 2.1 Case
**ID:** `caseId` (UUID preferred; stable)  
**Fields (beta):**
- `id` (string)
- `createdAt`, `updatedAt` (ISO string)
- `status` (e.g., `draft`, `active`)
- `role` (`plaintiff` | `defendant`)
- `jurisdiction`:
  - `state` = `CA`
  - `county`
  - `courtId` (optional if you use it)
  - `courtName`
  - `courtAddress`
- `parties`:
  - `plaintiff` (name string)
  - `defendant` (name string)
  - optional contact/address fields (allowed)
- `caseNumber` (optional)
- `damages` (number or null)
- `category` / `claimType` (string)
- `facts` / `narrative` (string)
- `hearingDate` (optional)
- `hearingTime` (optional)

### 2.2 Document (Evidence)
**ID:** `docId` (UUID preferred; stable)  
**Required fields:**
- `docId`
- `caseId`
- `name` (original filename)
- `mimeType`
- `size`
- `uploadedAt` (ISO string)
- `order` (exhibit order integer, optional but recommended)
- `docType` (e.g., `evidence`, `court_notice`, `other`)
- `description` (short user-entered note)
- `extractedText` (string, may be empty in beta)
- `storageRef` (internal IndexedDB handle / blob storage pointer)

### 2.3 Draft (AI Output)
**ID:** `draftId`  
**Fields (beta):**
- `draftId`
- `caseId`
- `type` (e.g., `demand_letter`, `response_outline`, etc. — minimal set in beta)
- `createdAt`, `updatedAt`
- `sourceDocIds` (array of docIds used)
- `promptVersion` (string)
- `content` (string)
- `notes` (optional)

### Relationships
- One Case → many Documents
- One Case → many Drafts
- Drafts reference Documents by `sourceDocIds`

---

## 3) Storage Plan Freeze (Beta)

### IndexedDB (required for beta)
- Store Case records (local-first)
- Store Document records + file data (local-first)
- Store Draft records (local-first)

### Explicit non-requirements for beta
- No server DB required for core operations
- No cloud file storage required for core operations

### Rationale
- Beta is 10–20 users, testing product flow and usability.
- Local-first removes deployment complexity and reduces failure modes.

---

## 4) Routing & Page Map Freeze (App Responsibilities)

All routes are **CA-only** and should accept `?caseId=...` where relevant.

### Required pages
- `/` (home / entry)
- `/intake-wizard`  
  - Creates/updates Case record
  - Routes to `/documents?caseId=...`
- `/documents?caseId=...`  
  - Upload/list/delete/open documents for that case
  - Edit metadata (docType, description, exhibit order)
- `/document-preview?caseId=...&docId=...` (or equivalent)  
  - View a single document record + extracted text placeholder
- `/case-dashboard?caseId=...` (or your current dashboard route)  
  - Case summary + documents count + next actions tiles
- `/filing-guidance?caseId=...`  
  - Config-driven checklist + printable output

---

## 5) Jurisdiction Config Freeze (CA Format)

### Required properties
- Counties list
- Courts per county
- Filing guidance steps per court/county

### JSON shape (minimum viable)
- `state: "CA"`
- `counties: [{ name, courts: [{ courtId, courtName, address, guidanceSteps: [...] }] }]`

**Directory expectation (already trending this way):**
- `app/_config/jurisdictions/ca.js` (or equivalent)
- Keep CA isolated so other states can be added later without refactor.

---

## 6) AI Orchestration Contract (Beta)

### Inputs (beta)
- Case record (facts, parties, damages, jurisdiction)
- Selected doc metadata
- Extracted text if present (optional)

### Output (beta)
- Draft record saved locally (IndexedDB)
- `promptVersion` recorded
- Minimal “citations” approach:
  - cite by `(filename, optional page placeholder)` only
  - no heavy citation engine in beta

### Hard guardrails
- No claims of legal representation
- Always “decision-support” language
- Do not fabricate citations to statutes/cases (use `[verify]` if needed)

---

## 7) Directory Layout Freeze (Minimal)

- `/app` → routes + UI
- `/app/_repository` → local-first repositories
- `/app/_config` → jurisdiction/config constants
- `/app/_schemas` → Zod schemas (where applicable)
- `/app/_components` → shared UI components

Avoid moving existing working files unless explicitly required.

---

## 8) 10-Item Implementation Checklist (Code Thread)

1. Confirm Intake Wizard outputs a Case record with stable `caseId`
2. Ensure `/documents?caseId=...` is fully case-scoped
3. Ensure document metadata edits persist (description, docType, order)
4. Ensure document open/view works reliably (object URL or preview route)
5. Dashboard shows case summary + document count
6. Filing guidance pulls from CA config (no hard-coded steps in UI)
7. Printable checklist output
8. Draft model + local persistence (DraftRepository)
9. Minimal AI “generate draft” action (single prompt template + version)
10. Beta QA pass: refresh persistence, deletion, navigation, empty states

