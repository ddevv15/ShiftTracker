# Shift Reports: Design

**Date:** 2026-10-01 · **Status:** Draft for review

## Goal

Field workers record **where** they worked, **what** they did, **photo proof** and **problems** for each shift. They do it mostly by tapping, with almost no typing. Admins review everything in one place and export it.

## Decisions

| Topic | Decision |
|---|---|
| Work type | On-site / field work, **one site per shift** |
| When | Add anytime during the shift; a **wrap-up sheet at clock-out** shows what's already there and asks only for what's missing |
| Captured (v1) | Site, tasks done, photos (Before/During/After), issue flags, optional note |
| Deferred | Voice notes (team speaks Gujarati; audio recording is the planned approach), materials, customer sign-off, mileage |
| UI language | English |
| Photo storage | **Cloudflare R2**, private bucket `shifttracker-photos` |
| Required to end a shift | A site **and** at least one task. Applies only once the admin has created at least one active site and one active task |

## Data model

**`Site`** (new collection): `name`, `address?`, `location? {latitude, longitude}`, `active`, `sortOrder`.

**`ReportOption`** (new collection): `type: 'task' | 'issue'`, `label`, `active`, `sortOrder`. Seeded issue flags: *Needs return visit, Damage found, Safety concern, Waiting on parts, Customer not available*.

**`Shift.report`** (embedded, one per shift):

```
report: {
  site:    { id, name }              // name copied so renames don't rewrite history
  tasks:   [{ id, label }]
  issues:  [{ id, label }]
  note:    String (≤ 500 chars)
  photos:  [{ _id, key, tag: 'BEFORE'|'DURING'|'AFTER', takenAt, location?, size }]
  submittedAt: Date
}
```

Hiding a site or option sets `active: false`. It disappears from pickers, but old reports keep their copied labels.

## API

**Worker (authenticated, own data only)**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/report-options` | Active sites (with coordinates for nearest-site suggestion), tasks, issue flags |
| GET | `/api/shifts/current/report` | Report for the open shift, with signed photo URLs |
| PATCH | `/api/shifts/current/report` | Autosave `siteId`, `taskIds`, `issueIds`, `note` |
| POST | `/api/shifts/current/photos?tag=&takenAt=&lat=&lng=` | Raw image body (JPEG/PNG/WebP, ≤ 4 MB, checked by file signature); server uploads to R2 |
| DELETE | `/api/shifts/current/photos/:photoId` | Remove a photo before the shift ends (also deletes it from R2) |
| POST | `/api/shifts/end` | *Existing.* Now rejects with `REPORT_INCOMPLETE` if the site or tasks are missing (when required); sets `report.submittedAt` |
| GET | `/api/shifts/:shiftId/report` | Read-only report for one of the worker's own past shifts |

**Admin**

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/admin/sites` | List / create sites |
| PUT | `/api/admin/sites/:id` | Rename, move, hide/show, reorder |
| GET/POST | `/api/admin/report-options` | List / create tasks and issue flags |
| PUT | `/api/admin/report-options/:id` | Rename, hide/show, reorder |
| GET | `/api/admin/shifts/:shiftId/report` | Full report with signed photo URLs |
| GET | `/api/admin/shifts` | *Existing.* Adds `site`, `photoCount`, `issues` per row; new filters `siteId`, `hasIssues` |
| GET | `/api/admin/shifts/export` | *Existing.* Adds Site, Tasks, Issues, Note, Photo count columns |

## Photo flow

1. **Phone:** resize to ≤ 1600 px and re-encode as JPEG (≈ 300 KB).
2. **Phone → API:** upload with a progress ring. The worker keeps working; failed uploads show a retry button.
3. **API checks:** an open shift belongs to the user; fewer than **20** photos; real image signature; ≤ 4 MB (under Vercel's 4.5 MB body limit).
4. **API → R2:** stored as `shifts/<shiftId>/<photoId>.jpg`, then the photo is recorded in `report.photos`.
5. **Viewing:** URLs are signed per request and expire after **1 hour**. Workers get URLs only for their own shifts; admins for any shift. No CORS setup is needed.

Photos are kept when a shift is edited or an employee is deleted.

## Worker UI

Follows the `apple-design` skill: large touch targets, spring motion, a draggable bottom sheet, and respect for the phone's reduced-motion setting.

**"Today's job" card** (shown while clocked in):
- **Site:** if GPS is within ~300 m of a saved site, a one-tap *"At Sunrise Apartments?"* prompt. Otherwise, a list sorted by distance, then by recent use. Search appears when there are more than 8 sites.
- **Photo button:** opens the camera directly. A *Before / During / After* control defaults to *Before* for the first photo and *During* after that.
- **Chips:** task chips, and issue chips (tinted red).
- **Note:** behind "Add note".
- **Autosave:** every change saves automatically, with a quiet "Saved" indicator.

**Clock-out wrap-up sheet:**
- **Pre-filled summary:** everything already added.
- **Nudges:** prompts only for what's missing (e.g. *"Add an After photo?"* opens the camera already set to After).
- **Pending uploads:** while photos are uploading, the button reads *"Finishing 2 uploads…"*.
- **Submit:** one button, *"End shift & submit"*.

**History:** past shifts open a read-only report.

## Admin UI

- **Setup tab (new):** sites (with "Use my current location"), tasks and issue flags. Add, rename, reorder, hide.
- **Shifts tab:**
  - **New columns:** site, photo count, red issue chips.
  - **New filters:** Site, Has issues.
  - **Report view:** a row opens the report, with photos in a grid that opens full size, plus a map link per photo.

## Errors and edge cases

| Situation | Behavior |
|---|---|
| No sites or tasks set up yet | The clock-out requirement is skipped, so shifts can always end |
| Admin closes a forgotten shift | Not blocked by an incomplete report |
| R2 unavailable | The photo upload fails with a retry option; the report still saves |
| Bad network | Uploads retry; wrap-up waits for pending uploads, or the worker can remove a stuck one |
| Upload succeeds but saving the record fails | The orphaned R2 object is harmless (acceptable for v1) |

## Configuration

New environment variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. The app currently uses an account-level admin R2 key, per the owner's decision. A bucket-scoped *Object Read & Write* key can replace it by changing only these values.

## Testing

- **API end-to-end:** run against a throwaway in-memory database:
  - options CRUD
  - autosave
  - required-field rule, including the "nothing configured" bypass
  - photo limits and type checks
  - ownership: workers can't see other workers' reports
  - CSV columns
- **R2 integration:** real bucket, under a `_test/` prefix that is cleaned up afterwards.
- **Browser check:** phone-sized viewport, covering the job card, camera flow, wrap-up sheet and admin report view.
- **Regression:** existing suites (57 checks) must still pass.
