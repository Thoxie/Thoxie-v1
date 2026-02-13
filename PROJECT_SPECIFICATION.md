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
  - `courtId` (optional)
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
- `type` (minimal set in beta)
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

---

## 4) Routing & Page Map Freeze

All routes are **CA-only** and should accept `?caseId=...` where relevant.

- `/intake-wizard`
- `/documents?caseId=...`
- `/document-preview?caseId=...&docId=...` (or equivalent)
- `/case-dashboard` and `/case-dashboard?caseId=...`
- `/filing-guidance?caseId=...` (plus printable output route)

---

## 5) Jurisdiction Config Freeze (CA)

- County list
- Courts per county
- Filing guidance steps per court/county

Keep CA isolated so other states can be added later without refactor.

---

## 6) AI Orchestration Contract (Beta)

Inputs:
- Case record
- Selected doc metadata
- Extracted text if present (optional)

Outputs:
- Draft record saved locally
- `promptVersion` recorded

Guardrails:
- No legal representation claims
- Decision-support language only
- No fabricated legal citations; use `[verify]` where needed


