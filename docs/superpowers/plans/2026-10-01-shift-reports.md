# Shift Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workers record site, tasks, tagged photos, issues and a note per shift, mostly by tapping. Admins configure the pick-lists and review reports.

**Architecture:**
- **Backend:** the report is embedded in the `Shift` document; two new collections, `Site` and `ReportOption`. Photos are uploaded through the API (raw body ≤ 4 MB) into a private Cloudflare R2 bucket and viewed through signed URLs that expire after 1 hour.
- **Frontend:** the worker side gets a "Today's job" card plus a clock-out wrap-up sheet (apple-design); the admin side gets a Setup tab plus a report modal.

**Tech Stack:** Express 4, Mongoose 7, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2), React 19, Tailwind 4, axios.

**Spec:** `docs/superpowers/specs/2026-10-01-shift-reports-design.md`

## Global Constraints

- **Required to end a shift:** a site plus ≥ 1 task, but only when ≥ 1 active site **and** ≥ 1 active task exist. Admin closes are never blocked.
- **Photos:** ≤ 20 per shift; ≤ 4 MB each; JPEG/PNG/WebP detected by file signature; key `shifts/<shiftId>/<photoId>.<ext>`.
- **Photo tags:** `BEFORE` | `DURING` | `AFTER`.
- **Note:** ≤ 500 characters.
- **Signed URLs:** expire after 3600 s. Workers get URLs only for their own shifts.
- **Seeded issue flags:** Needs return visit, Damage found, Safety concern, Waiting on parts, Customer not available.
- **Nearest-site prompt:** within 300 m. Site search appears when there are more than 8 sites.
- **Environment variables:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
- **Regression:** the existing 57 API checks must still pass.

## File Map

| File | Responsibility |
|---|---|
| `backend/utils/photoStorage.js` (new) | R2 wrapper: `isConfigured()`, `putPhoto(key, buffer, contentType)`, `deletePhoto(key)`, `signedPhotoUrl(key)` |
| `backend/utils/imageType.js` (new) | `detectImageType(buffer) → {mime, ext} \| null` from magic bytes |
| `backend/models/Site.js`, `backend/models/ReportOption.js` (new) | Pick-list collections |
| `backend/models/Shift.js` | Add `report` subdocument |
| `backend/utils/reportRules.js` (new) | `isReportRequired()`, `missingReportFields(shift)`, `reportForClient(shift)` (adds signed URLs) |
| `backend/controllers/reportController.js` (new) | Worker endpoints: options, current report, photos, past report |
| `backend/controllers/setupController.js` (new) | Admin CRUD for sites and options |
| `backend/routes/reportRoutes.js` (new) | Mounts worker report routes |
| `backend/controllers/adminController.js` | List columns/filters, report view, CSV columns |
| `backend/controllers/shiftController.js` | `endShift` enforces the rule and sets `submittedAt` |
| `frontend/src/lib/reportApi.js`, `frontend/src/lib/compressImage.js` (new) | API calls; resize to ≤ 1600 px JPEG |
| `frontend/src/components/report/*` (new) | `JobCard`, `PhotoCapture`, `ChipGroup`, `WrapUpSheet`, `Sheet`, `ReportView` |
| `frontend/src/components/admin/SetupPanel.tsx`, `ReportModal.tsx` (new) | Admin setup and report review |

## Tasks

### Task 1: R2 storage module and image detection
- [ ] `imageType.js`: JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`.
- [ ] `photoStorage.js`: S3Client with `region: 'auto'` and endpoint `https://<account>.r2.cloudflarestorage.com`; signed GET via `getSignedUrl` with `expiresIn: 3600`.
- [ ] **Test:** integration script against the real bucket under `_test/`: put → signed URL fetch returns the same bytes → delete → fetch fails. Plus a unit check of `detectImageType` on JPEG/PNG/WebP/text buffers.

### Task 2: Models
- [ ] `Site { name (required, trimmed, ≤ 100), address, location { latitude, longitude }, active (default true), sortOrder }`.
- [ ] `ReportOption { type: 'task' | 'issue', label (required, ≤ 60), active, sortOrder }`, plus `ensureDefaultIssues()`, which seeds the 5 flags when there are no issue options.
- [ ] `Shift.report { site { id, name }, tasks [{ id, label }], issues [{ id, label }], note (≤ 500), photos [{ _id, key, tag, takenAt, location, size }], submittedAt }`.

### Task 3: Admin setup API (`/api/admin/sites`, `/api/admin/report-options`)
- [ ] GET lists everything, including inactive items, sorted by `sortOrder`, then `name`/`label`.
- [ ] POST creates; PUT `:id` updates `name|label|address|location|active|sortOrder`.
- [ ] **Tests:** create, rename, hide, invalid id → 400, employee → 403, issue flags seeded on first GET.

### Task 4: Worker report API
- [ ] `GET /api/report-options` → `{ sites, tasks, issues }` (active only).
- [ ] `GET /api/shifts/current/report` → `reportForClient` (signed URLs), or `null` with no open shift.
- [ ] `PATCH /api/shifts/current/report` → validates ids against **active** options and stores copied labels. `siteId: null` clears the site.
- [ ] `POST /api/shifts/current/photos` with `express.raw({ type: 'image/*', limit: '4mb' })` and query `tag`, `takenAt`, `lat`, `lng`.
- [ ] `DELETE /api/shifts/current/photos/:photoId`.
- [ ] `GET /api/shifts/:shiftId/report` → own shifts only (404 otherwise).
- [ ] `endShift` → when `isReportRequired()` and fields are missing: 400 `{ code: 'REPORT_INCOMPLETE', missing: ['site', 'tasks'] }`. Otherwise sets `report.submittedAt`.
- [ ] **Tests:**
  - autosave round-trip and inactive id rejected
  - note > 500 → 400
  - photo: text body rejected, 21st photo rejected, delete removes it from R2
  - another worker's report → 404
  - end shift blocked / allowed / bypass when nothing is configured
  - admin close not blocked

### Task 5: Admin report review
- [ ] List rows add `site`, `photoCount`, `issues`; filters `siteId` and `hasIssues=true`.
- [ ] `GET /api/admin/shifts/:shiftId/report` → `reportForClient`.
- [ ] CSV adds `Site, Tasks, Issues, Note, Photos` (labels joined with `; `).
- [ ] **Tests:** filters, report view has signed URLs, CSV columns.

### Task 6: Worker UI (apple-design)
- [ ] `compressImage(file) → Blob` (canvas, longest side ≤ 1600 px, JPEG quality 0.8).
- [ ] `reportApi`: `getOptions`, `getCurrentReport`, `saveReport(patch)`, `uploadPhoto(blob, meta, onProgress)`, `deletePhoto(id)`, `getShiftReport(id)`.
- [ ] `JobCard`: nearest-site prompt (haversine ≤ 300 m), site list, `PhotoCapture` (tag segmented control, `<input type=file accept=image/* capture=environment>`, thumbnails with progress ring and retry), task/issue `ChipGroup`s, collapsible note, debounced autosave (600 ms) with a "Saved" indicator.
- [ ] `WrapUpSheet`: opened by End Shift when the report is required or anything is missing. It shows a summary, nudges, a pending-upload state, and *End shift & submit*.
- [ ] `Sheet`: bottom sheet with spring motion, drag to dismiss, `prefers-reduced-motion` fallback.
- [ ] History rows open a read-only `ReportView`.
- [ ] **Test:** phone-viewport browser pass (390×844), covering site pick, photo upload, chips, wrap-up, and submit.

### Task 7: Admin UI
- [ ] `SetupPanel` (Setup tab): three lists with add / rename / hide / up-down ordering. Sites have "Use my current location".
- [ ] `ShiftsPanel`: Site and Has-issues filters; site column, photo count, red issue chips; clicking a row opens `ReportModal` (grid + full-size viewer, map link per photo).
- [ ] **Test:** browser pass of setup and the report modal.

### Task 8: Ship
- [ ] Add the 4 R2 variables to Vercel Production.
- [ ] Run all suites (regression 57 + new ones); build and lint the frontend.
- [ ] Commit; push to `main` (auto-deploys); wait for Ready.
- [ ] Live smoke test: new endpoints return 401 without auth; the bundle contains the new UI.
