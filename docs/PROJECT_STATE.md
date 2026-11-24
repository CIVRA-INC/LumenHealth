# Project state

> Source of truth for where the project stands. Read this first in every session, then `git status`
> and the working tree. Update it at the end of every session with what actually exists and what
> was actually verified.

**Last updated:** 2026-10-27 (session 7: audit of session 6, host guard on disposable databases) · **Branch:** `greenfield/foundation` (cut from `develop` @ `8130fb9`)

## Summary

Stage 0 (foundation), Stage 1 (shell, identity, tenancy, dashboard) and Stage 2 (outpatient workflow)
are implemented end to end and verified. Stage 3 (payments) has its boundary designed and documented
but **no payment code exists yet**; Stellar support is **not** live. Stage 4 (pilot readiness) is
partly started (backup drill, accessibility checks) and has a checklist in the roadmap.

## Session 7: Independent audit of session 6 (verified from code and runs, nothing committed)

Session 6's claims were re-checked against the code and by running things. All held. One gap was found and fixed.

| Requirement                    | Status                                 | Evidence                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db:reset` protection          | Implemented                            | `prisma/dev-target.ts` (local host, name exactly `lumenhealth`, not production, URLs agree) runs before any destructive step in `reset-dev.ts`; typed confirmation required. Dry run against the real `.env` showed `lumenhealth` on localhost:5432 as `lumen`; a `_e2e` target and a remote host were both refused (exit 1). Unit tests pass. |
| Dev database initialisation    | Implemented                            | `pnpm bootstrap` = `.env` + migrate deploy + seed; never resets. `lumenhealth` is still the old half-seeded database (2 orgs, 5 users, 0 patients) and `seed.ts` skips when the org exists, so **it needs the owner's `pnpm db:reset`**.                                                                                                       |
| Transactional, repeatable seed | Implemented (code, session 6 runs)     | `seed.ts` wraps the seed in one `$transaction` and exits early if `lumen-general` exists. Rollback and rerun were demonstrated in session 6 on a scratch database; **not re-run today**.                                                                                                                                                       |
| Demo credentials               | Implemented                            | README table and `setup.md`; synthetic password only.                                                                                                                                                                                                                                                                                          |
| E2E isolation                  | Implemented, verified                  | Config pins `lumenhealth_e2e`; global setup asserts 330+2 patients, 7 users before tests; teardown checks for leaks. `pnpm test:e2e`: 26 passed; `lumenhealth` unchanged afterwards.                                                                                                                                                           |
| Screenshot isolation           | Implemented (inspected, not run today) | `visual-stack.mjs` uses `*_visual` only; fixtures gated behind `SHOTS_FIXTURES`.                                                                                                                                                                                                                                                               |
| API test database              | Implemented, verified                  | `test/global-setup.ts` drops, recreates and migrates `*_test` every run.                                                                                                                                                                                                                                                                       |

**Gap fixed:** the disposable-database helpers (`e2e:prepare`, `visual:prepare`, API test setup) checked only the name
suffix, so a remote `*_e2e`/`*_test` URL would have been dropped. `disposableTarget` now also requires a local host
(`LOCAL_HOSTS` shared with `dev-target.ts`); a test covers it.

**Run today:** `pnpm check` exit 0 (contracts 15, UI 31, web 23, API 93); `pnpm test:e2e` 26 passed; `pnpm db:reset --dry-run`.
**Not run:** `pnpm shots`, a destructive reset, a fresh scratch-database seed.

**Update 2026-11-24:** the owner ran `pnpm db:reset`; `lumenhealth` now holds 332 patients, 7 users, 10 appointments, 3 encounters, and the app was started against it.

**Exact next action:** admin walkthrough of the app at http://localhost:5173 (`pnpm dev`), then merge the foundation PR.

## Session 6: Safe database reset and foundation handoff (tooling, tests and docs only)

**The inconsistency, traced.** Session 5's report mixed two different commands:

| Command                         | Target (resolved from `.env`; a shell variable overrides it)                                    | Guard before this pass                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm db:reset`                 | `MIGRATION_DATABASE_URL`, else `DATABASE_URL` → **`lumenhealth`** on localhost:5432, as `lumen` | **None of ours.** `prisma migrate reset --force` only; Prisma's own block on AI agents |
| `pnpm test:e2e` (`e2e:prepare`) | `E2E_MIGRATION_DATABASE_URL` → `lumenhealth_e2e`                                                | Refused any name not ending `_e2e`                                                     |
| `pnpm shots` (`visual:prepare`) | `VISUAL_*`, else the e2e URL with `_visual` → `lumenhealth_visual`                              | Refused any name not ending `_visual`                                                  |
| API tests (`global-setup`)      | `TEST_MIGRATION_DATABASE_URL` → `lumenhealth_test`                                              | None (only migrated it; never dropped it)                                              |

So the `_e2e`/`_visual` guard never covered `db:reset`, which would have reset whatever the environment resolved to.
That was a real gap, now closed (below). The guard that blocks `lumenhealth` from the disposable helpers is intentional
and unchanged; `lumenhealth` is reset only through `db:reset`.

**What changed**

- **`pnpm db:reset` is guarded and explicit** (`prisma/dev-target.ts`, `prisma/reset-dev.ts`). Before any destructive step it
  requires: a local host; the database named exactly `lumenhealth`; `NODE_ENV` not production; `DATABASE_URL` and
  `MIGRATION_DATABASE_URL` naming the same database. It prints the target and row counts of what it will destroy, and
  proceeds only when the exact database name is typed (or passed as `--confirm=lumenhealth`). `--dry-run` changes nothing.
  Prisma's agent block is untouched. Nothing was reset by me.
- **API tests now start from an empty database every run**: `lumenhealth_test` is dropped, recreated and migrated by
  `test/global-setup.ts` (guarded to `*_test`). Before, rows accumulated by design (1,563 patients had built up) and the
  migrations were never exercised from scratch. After one run the database holds 175 patients, not thousands.
- Docs: `setup.md` (initialise vs reset), `testing.md` (databases table), README (credentials, commands).

**Verified in this pass (actually run)**

| Verification                                                                                                                                                      | Result                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm db:reset --dry-run` with the real `.env`                                                                                                                    | Target "lumenhealth" on localhost:5432 as `lumen`; held 5 users, 0 patients, 0 appointments, 0 encounters, 0 audit events; nothing changed                                                 |
| Reset refused: `MIGRATION_DATABASE_URL` set to `lumenhealth_e2e`; `DATABASE_URL` set to `lumenhealth_test`; `--confirm=nope`; non-interactive without `--confirm` | All refused with the expected message; development database unchanged afterwards (5 users)                                                                                                 |
| Guard unit tests (`test/dev-target.test.ts`, `test/disposable-db.test.ts`)                                                                                        | Pass: every non-development name, remote host, production, URL mismatch, and non-name confirmations                                                                                        |
| Documented sequence `pnpm db:migrate && pnpm db:seed` on a scratch database (created and dropped by me)                                                           | 5 migrations applied; seeded 332 patients, 7 users, 10 appointments, 3 encounters, 2 organisations                                                                                         |
| Seed run again, twice more                                                                                                                                        | "Demo data already present"; counts unchanged (no duplicates)                                                                                                                              |
| Seed with a conflicting user planted                                                                                                                              | Failed with a unique-constraint error; organisations, branches and patients all 0 (full rollback); after removing the conflict the seed succeeded (332 patients)                           |
| Final `pnpm check` (format, lint, typecheck, tests, build) and `pnpm test:e2e`                                                                                    | check exit 0: contracts 15, UI 31, web 23, API 92 (11 files, on a freshly rebuilt `lumenhealth_test`); e2e 26 passed                                                                       |
| Demo logins against a seeded database                                                                                                                             | All 7 seeded accounts return 200 with `LumenDemo!2026`; a wrong password returns 401                                                                                                       |
| Playwright isolation                                                                                                                                              | Config pins `DATABASE_URL` and `e2e:prepare` to `lumenhealth_e2e`; runs of the suite leave `lumenhealth` unchanged (5 users, 0 patients); global setup/teardown guard checked in session 5 |
| `pnpm shots` isolation                                                                                                                                            | Ran against `lumenhealth_visual` only (session 5); the plain `shots` script creating no records was **inspected, not run**                                                                 |

**Demo logins:** password `LumenDemo!2026`; `frontdesk@lumen.test`, `nurse.adeyemi@lumen.test`, `dr.okafor@lumen.test`,
`dr.bello@lumen.test`, `admin@lumen.test`, `admin@harbour.test`, `frontdesk@harbour.test` (README has the table).

**Still pending, yours:** the development database `lumenhealth` is the old half-seeded one (2 organisations, 5 users,
nothing else). Run `pnpm db:reset --dry-run`, then `pnpm db:reset` and type `lumenhealth`. Afterwards it has 330 + 2
patients, 7 users, 10 appointments and 3 encounters.

## Session 5: Final UI polish and demo-data integrity (frontend, tooling and seed only)

**Where the extra records came from (verified, not guessed).** The registry screenshots showed 337 patients
(331 before). The standard seed creates exactly 330 patients in Lumen General Hospital (and 2 in Harbour). Every
other record was created after the seed, and by the two things that wrote to the end-to-end database:

| Record                                                      | Created by (evidence)                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Tenant Boundary`                                           | `apps/web/e2e/access-control.spec.ts` (cross-tenant test); in the e2e database seconds after the seed, MRN 332         |
| Random-letter names (`Dupxxxx Licxxxx`, `Adaxxxx Ezexxxx`…) | `randomName()` in the journey and duplicate-registration e2e tests                                                     |
| 60-character name, long note                                | the screenshot script's stress fixture, written to whatever server it was pointed at (it was pointed at the e2e stack) |

So the screenshots were taken from a database that had just been used by the e2e tests, not from the demo seed.
The development database (`lumenhealth`) was **not** polluted: it holds 2 organisations, 5 users and no patients,
appointments, sessions or audit events (checked read-only). That is the old half-seeded state, not test data.

**What changed**

- **Visual review has its own database.** `pnpm shots` recreates `lumenhealth_visual` from migrations plus the
  unmodified standard seed, starts the API and web app against it on their own ports, adds the adversarial
  fixtures to that database only, captures, and stops. Every run starts identically. The script that photographs
  an arbitrary server (`pnpm --filter @lumen/web shots`) no longer creates any records.
- **Shared, guarded database reset** (`prisma/disposable-db.ts`): used by `e2e:prepare` and the new
  `visual:prepare`; refuses any database not named `*_e2e` / `*_visual`; unit-tested.
- **The seed is atomic** (one transaction). A failure leaves an empty database that can be re-seeded; the half-seeded
  state that the development database is in cannot recur.
- **e2e isolation proven in the run itself:** a Playwright global setup asserts the e2e database is exactly the documented
  seed (330 + 2 patients, 7 users) before the first test, and a global teardown asserts none of the tests' records
  reached the development database. The setup guard was checked to fail when the expectation is wrong.
- **Encounter header:** the full name now has its own row (balanced wrapping, never shortened or clamped), with the
  identifier line on the left and status, primary action and the "More" menu on the right of the next row, so
  they cannot collide at 1440, 1280 or 390 px. The breadcrumb reads "Consultations › Consultation, 23 Oct 2026"
  (the patient detail breadcrumb uses the MRN) instead of repeating the name.
- **Context rail:** no longer repeats the name; label column of fixed width, values wrap inside their column; the
  Patient block keeps date of birth, phone and the emergency contact. From 1280 px it is the sticky right column; below
  that it is a closed "Patient and visit details" disclosure above the note (single DOM, not duplicated).

**Verified in this pass (actually run)**

| Check                                                         | Result                                                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check` (format, lint, typecheck, tests, build)          | exit 0; contracts 15, UI 31, web 23, API 86                                                                                          |
| `pnpm test:e2e`                                               | 26 passed (adds header at 1440 and 1280, rail without the name, phone disclosure)                                                    |
| `pnpm shots` (isolated stack)                                 | ran; the review database ended at 333 patients = 330 seeded + 1 fixture + 2 Harbour; the development database untouched (0 patients) |
| Seeded state from the standard path (`migrate deploy` + seed) | 330 + 2 patients, 7 users, 10 appointments, 3 encounters (counted in `lumenhealth_visual`)                                           |

**Screens actually looked at, before and after:** consultation with the long name at 1440x900, 1280x800 and 390x844;
patients at desktop width (long name wrapped, 331 = 330 seeded + the fixture, no `Tenant Boundary` or random names).
Before-images are in `apps/web/screenshots/before-final/`. Not re-inspected after this change: Today, Schedule,
Staff, Audit, signed consultations and the other screens.

**Still open: your action.** The development database `lumenhealth` is half-seeded (no patients). It contains
only synthetic seed rows, so nothing of value is lost, but Prisma blocks an agent from running the reset. Run it
yourself: `pnpm db:reset`. After that, `lumenhealth` has the same seeded state as above.

**Limits.** The 60-character name fixtures exist only in `lumenhealth_visual`. (Session 6 changed the API test database to be rebuilt every run.)

## Session 4: Final product design craft pass (frontend only)

A targeted pass driven by screenshots of the live app, not a redesign. **No backend, schema, contract,
authentication, tenancy or clinical-rule change.** Findings were checked against the code and the running
app before anything was changed:

| Finding                                            | Verified cause                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Patient names cut off with room to spare           | Fixed `max-w-[22rem]` + `truncate` on the registry link and `max-w-sm` on `PatientCell`; CSS, not data                    |
| Registry columns moved between pages               | Auto table layout sized by the longest value on each page; no column widths                                               |
| Dashboard banner too loud; repeated headings       | Full-width `lime-100` band; the top bar repeated the page title ("Today" / "Today" / eyebrow date)                        |
| Ruler hard to read                                 | Markers were anonymous, status key was a separate legend, "now" had no label, first hour label was clipped ("7" for "07") |
| Consultation looks like a form                     | Bordered boxes on all five note fields, 15 px text, sections as plain titled blocks                                       |
| Consultation header bled short; note column narrow | `-mx-8` against the page's `lg:px-10`; context rail started at 1024 px, leaving a ~340 px sheet                           |
| Mobile registry very long                          | Default page size 25 on every screen                                                                                      |
| **Sidebar width changes between desktop sizes**    | **Not reproduced.** The shell grid is a fixed `256px` rail at every width from 1024 px; nothing was changed               |

**What changed**

- **Consultation workspace.** Header: name takes the room the actions leave and wraps to two lines (full name
  also in the tooltip and the context rail); status and the one primary action sit together; "Mark as entered in
  error" moved into a "More encounter actions" menu with a confirmation dialog (behaviour unchanged). The note
  is a clinical document: section titles in the display face, a 40 rem reading measure at 16 px / 1.7, and
  borderless "document" fields (hairline underline, evergreen on focus, growing with the text; autosave and
  validation untouched). Vitals are one aligned reading grid (BP, pulse, respiration, SpO₂, temperature, weight,
  height, BMI) with hairlines instead of boxes and no interpretation or invented ranges. Diagnoses show code,
  description, Primary tag and Confirmed/Provisional state; prescriptions show a dashed amber edge and hollow
  marker for **Draft** against a plain row with a solid marker for **Active**; "Remove" is a labelled button,
  "Cancel order" is the only red action. Signed/not-attending notices are one-line strips at the head of the
  document. The context rail is a right column from 1280 px and a three-column strip below it.
- **Registry.** Patient column takes the remaining width and wraps to two lines (never truncates); fixed widths
  for the other columns; muted secondary columns; sort arrows appear on hover/focus except on the sorted column;
  the ⋯ menu is dimmed until the row is hovered or focused (full strength on touch); hover shows a 2 px
  evergreen edge; stronger header rule and a tinted footer band. Phone-width default is 10 rows (any offered
  size can still be chosen, and a size in the URL wins) and the footer shows "Page X of Y".
- **Today.** The continuation band is a white row with an evergreen edge; chartreuse only on its button. The
  top bar no longer repeats the title of a top-level page. The summary line doubles as the ruler's key (same
  markers), the ruler darkens the part of the day already gone and labels the needle "Now hh:mm", and each
  marker has a tooltip with time, patient and state. Waiting shows ticket, arrival time ("since 12:26"), wait
  duration and a **Next** tag on the first patient; supporting sections use a quieter heading.
- **Shared components (`packages/ui`).** `TextArea variant="document"`, `DataTable` `width` and `quietActions`,
  `SectionHeader quiet` (and a zero count now shows), `PageHeader` actions on the title row, `Tag tone="inverse"`,
  a `text-prose` size token. See `development/design-system.md`.

**Verified in this pass (actually run)**

| Check                                                | Result                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm check` (format, lint, typecheck, tests, build) | exit 0 (final run, after the last code edit)                               |
| contracts / ui / web / API tests                     | 15 / 31 / 23 / 83 passed                                                   |
| `pnpm test:e2e`                                      | 23 passed (adds long-name wrapping and phone default page size); axe clean |

The first e2e run of this pass failed three tests; all three were real: my own "Page X of Y" label changed the
range text that two registry tests read, and the showcase's demo appointments lacked a patient, which crashed the
day ruler on `/design-system`. Both were fixed in code, not in the tests.

**Screens actually looked at, before and after** (1440x900 / 1280x800 / 390x844 via `pnpm --filter @lumen/web shots`;
before-images kept in the git-ignored `apps/web/screenshots/before/`): Today (clinician desktop and laptop, front desk
mobile), Patients (desktop; laptop pages 1, 17 and 34 of 10-row pages; mobile first page, second page and search),
Consultation in progress (desktop, laptop, mobile; long-name record and a plain one), Signed consultation
(desktop), Schedule (desktop), Patient detail (desktop). States at 1280x800: loading, empty, error with retry and
permission denied were captured again after the change; **only the registry first/middle/last pages and the mobile
search were opened and read in this pass**, the other four state captures were taken but not individually reviewed.
Not looked at after the change: Staff, Audit, Account, Register/Edit, Login, Consultations list and the signed
consultation on laptop/mobile; they use the shared table/header components that changed.

**Limits**

- No person has used the new consultation layout; the 40 rem measure and the placement of the "More" menu are reasoned.
- `field-sizing: content` (Chrome 123+, Edge, Safari 26) grows the note fields natively; other browsers use a
  measuring fallback that was not exercised in a browser.
- Dark theme, tablet captures, screen-reader and keyboard-only walkthroughs are still outstanding.

## Session 3: Design Rebuild 2 ("Lumen Instrument") and real data tables

Session 2's look was rejected as generic, so the interface was rebuilt around a new identity and a real
component library, and the lists were given real server-side pagination. **No clinical rules, auth,
tenancy or audit behaviour changed.** The backend changed only where pagination needed it (below).

**Identity.** Pale warm-stone canvas, white work surfaces with thin rules, a deep evergreen rail, and one
restrained chartreuse accent used only as a _fill with dark text_ (never as text or a hairline). Type:
Fraunces (variable, optical size) for page titles, Instrument Sans for reading, Geist Mono only for
identifiers, measurements and timestamps. All three are bundled from `@fontsource-variable/*`, so nothing
loads from a CDN and the build is reproducible. Signature motif: the **day ruler** on Today (hourly ticks,
real appointment markers, a "now" needle). Tokens: `packages/ui/src/styles/theme.css`.

**Design system (`packages/ui`)**, with a showcase at `/design-system` that renders the real components:
Button/IconButton; TextField, TextArea, Select, SearchField, Combobox, Checkbox, RadioGroup, FormField,
FormSection; Dialog, ConfirmDialog, Drawer, DropdownMenu, Popover, Tooltip; Tabs; Skeleton, Spinner,
Toaster, EmptyState, ErrorState, Alert; PageHeader, SectionHeader, RecordSection, DefinitionList;
Breadcrumbs; StatusIndicator, Tag, Avatar, Kbd; FilterBar/FilterSelect, TableToolbar; **DataTable** and
**Pagination**. Reference: `docs/development/design-system.md`.

**Tables.** One `DataTable` serves every list: sortable headers (`aria-sort`), loading skeleton rows,
empty and error-with-retry states, row click vs. row actions, footer pagination (page window, page size,
"21-30 of 331"). Below `md` the same data renders as a record list with a sort select, not a squeezed
table. Table state (page, page size, sort, order, search, filters) lives in the URL (`useTableState`), so
views are linkable and survive reload; the previous page stays on screen, dimmed, while the next loads.

**Screens.**

- **Today:** two compositions were built from real data and compared (A: next-action band + summary line +
  day ruler + waiting / with-clinician tables + attention and expected rail; B: a flow board). **A was
  chosen**: B hid the order of arrival, which is what a clinician acts on. Role-aware ordering is kept.
- **Patients:** production registry grid (name/MRN/phone search, four sorts, pagination, row menu).
- **Register / edit:** continuous sheet, live duplicate hint, unsaved-changes guard, next-step flow.
- **Consultation workspace:** document-style encounter; earlier vitals use DataTable.
- **Schedule, Staff, Audit, Consultations (new list), Account, Login** rebuilt on the same components.
  Booking uses an accessible Combobox patient picker backed by the paginated registry search.

**Pagination API (additive, backwards compatible for existing fields).**

- Request: `page` (>=1), `pageSize` (1-100, default 25), `sort` (per-endpoint whitelist), `order`
  (`asc`/`desc`), plus the endpoint's search/filters. Invalid values return `VALIDATION_FAILED` (400).
- Response: `{ items, total, page, pageSize, totalPages, hasNextPage, hasPreviousPage }`. The pre-existing
  `{items,total,page,pageSize}` fields are unchanged; the three new fields are additive. A page beyond the
  last returns no items with correct metadata (the web client clamps to the last page).
- Endpoints: `GET /patients` (sort `name|mrn|dateOfBirth|registered`, `q`), `GET /admin/users` (sort
  `name|role|lastLogin|status`, `q`, role/status filters), `GET /audit-events` (time order `order`, `action`
  prefix, `outcome`, `patientId`), `GET /encounters` (new; `status`, `mine`, `startedAt` order) and
  `GET /appointments` (`date`, paged).
- Guarantees: search and filters run **before** paging; ordering is deterministic (whitelisted column, then
  `id` as tiebreak); every query is organisation-scoped (and branch-scoped where the data is); the
  database is always the source of `total`.
- Schema: migration `20261023100400_search_and_sort_indexes` adds btree indexes for the registry sorts and
  encounter list, and `pg_trgm` GIN indexes on given name, family name, MRN and phone (raw SQL; see
  `development/database.md`). `PatientSummary` gained `registeredAt`. `docs/api/openapi.json` regenerated.
- Seed: now also generates 300 synthetic patients so pagination is exercised with realistic volume.

**Verified in this pass (actually run, final state)**

| Check                                                             | Result                                                                                                                                                                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` (format, lint, typecheck, tests, build)              | exit 0                                                                                                                                                                                                            |
| contracts / ui / web / API tests                                  | 15 / 24 / 22 / 83 passed                                                                                                                                                                                          |
| `pnpm test:e2e` (Playwright, Chrome, incl. axe WCAG 2.1 A/AA)     | 21 passed (registry, access control, a11y, journeys)                                                                                                                                                              |
| API pagination tests (`test/pagination.test.ts`, real PostgreSQL) | metadata, last/short/out-of-range pages, full coverage with no duplicates in every sort order, invalid input rejected, tenant isolation, stability when rows are inserted between requests; staff and audit lists |
| `pnpm --filter @lumen/api openapi:export`                         | regenerated                                                                                                                                                                                                       |

**Screens actually looked at** (PNG review via `pnpm --filter @lumen/web shots`, 17 screens x 1440x900,
1280x800, 390x844 = 51 captures; plus 6 state captures at 1280x800). Viewed individually: Today (admin,
clinician, both compositions), Patients (desktop, mobile), Schedule (desktop, mobile), Register (desktop,
mobile), Staff (desktop, mobile), Patient detail, Encounter with long content (desktop, mobile), Signed
encounter (desktop), Consultations (laptop), Audit (laptop, mobile), Account (laptop), Login, Design system
(full page). States viewed: loading skeleton, empty search, API error with retry, permission denied, page 3
sorted by MRN, booking dialog. **Not individually viewed:** the remaining laptop/mobile captures of
Account, Consultations, Encounter (signed), and the laptop variants of most other screens; they share the
same components and breakpoints but were not eyeballed one by one. No screen-reader or keyboard-only
walkthrough was done by a person; axe is automated only.

**Not done / limits**

- No usability testing with clinicians or front-desk staff. No dark theme. Tablet (768 px) not captured.
- Full-page captures show the rail only as tall as the first viewport: a property of the capture, since the
  shell is viewport-height; not seen in use.
- The audit list is cluttered by sign-in and read events in the seeded demo; filtering is by action prefix and
  result today. A richer filter (actor, action, date range) is a follow-up.
- Offset pagination is chosen for page-number UX; very large tables would need keyset pagination.
- `pg_trgm` needs the extension privilege on the target database (like `btree_gist`).
- The main web chunk is still ~605 kB (design-system page, encounter page and shared UI are split out).
- Vite logs a React Router "No HydrateFallback" dev warning on first load; harmless, not yet silenced.

## Session 2: UI/UX redesign (superseded visually by session 3)

The first UI was a functional prototype judged generic. It was audited against the live screens and
replaced. **No backend, schema, contract or business-rule changes** except one additive, optional
`sort` query parameter on `GET /patients` (`name` | `recent`; tested).

**Audit findings that drove the work:** content floating in a narrow centred column; a dashboard of four
identical stat tiles plus two cards and a greeting; duplicate primary actions (top bar and page); up to
three stacked pills per row; queue and appointments split across tabs; a registration form crammed into
a card; Inter plus a default-SaaS blue; shadows and 10 px radii everywhere.

**Identity ("the chart"):** IBM Plex Sans for reading and IBM Plex Mono for identifiers and measurements
(MRN, queue number, times, vitals); one ultramarine accent used for action/selection only; white work
surfaces and hairlines on a warm-grey desk; shadows only on floating layers; status shown as a dot and a
word, never a row of pills. Tokens live in `packages/ui/src/styles/theme.css`.

**What changed**

- **Shell:** compact rail (workspace row, five text-first nav items, account at the foot), top bar that
  says where you are (`Branch / Section / Record`, drawn from each page via a portal), patient search
  (Ctrl/⌘ K) and derived alerts. Account page replaces the lone change-password screen.
- **Today** (was dashboard): one flat figures row, then _Waiting_ (urgent first, wait time turns amber past
  30 min, **Start** for clinicians), _With a clinician_ (real in-progress encounters, "You" for your own)
  and _Expected_ (check in, "Late" when 15+ min past time). Section order and actions follow the role.
  The greeting is gone.
- **Patients:** search-first registry (name/MRN/phone with match highlighting, `/` to focus), sort,
  name-over-MRN identity cell, row menu (open / add to queue / book), URL-held state, honest empty/error
  states. Phone moves under the name on small screens.
- **Registration and editing:** one continuous sheet (title column + fields, hairline sections), inline
  validation on blur, live duplicate hint, sticky action bar, **unsaved-changes guard** (in-app navigation
  and tab close), and registration leads straight to "Add to today's queue / Book an appointment".
  Editing is now a full page (`/patients/:id/edit`) with stale-version handling instead of a modal.
- **Patient record:** identity band (MRN label, name, age/sex, born, phone) with the actions, then Record /
  Consultations / Appointments.
- **Consultation workspace:** the encounter reads as one document: latest vitals as readings (earlier
  readings disclosed), an auto-growing, comfortably set note, diagnoses, prescription, addenda. A sticky
  identity header carries the state, the action (**Review and sign**), and section navigation that doubles
  as the sign-readiness checklist (Note ✓, Diagnoses "needed"). A right rail shows encounter facts, patient
  context and previous visits. State and lock rules are unchanged; nothing shows as saved or signed before
  the API confirms.
- **Schedule:** single worklist grouped by where each patient is (With a clinician, Waiting, Expected,
  Finished) with a day switcher; the queue tab is gone.
- **Staff / Audit:** quieter tables; audit actions are described in plain language with the exact code
  beneath, and patient references link to the record.
- **Design-system page** rewritten around the new tokens and patterns.

**Verified in this pass (actually run)**

- Real-browser inspection of every screen at 1440×900, 1280×800 and 390×844 using
  `pnpm --filter @lumen/web shots` (Playwright + Chrome; writes git-ignored PNGs to `apps/web/screenshots/`),
  plus a stress patient with a 60-character name and a long history note. Problems found and fixed:
  breadcrumb overflow on mobile, tall sticky header on mobile, schedule/registry tables overflowing on
  narrow screens, clinician names wrapping, selects greyed by a `:read-only` rule, inconsistent "Sept".
- States captured: empty search, permission denied, API failure (request aborted), booking dialog.
- `pnpm check` exit 0 (format, lint, types, contracts 15 + web 14 + API 70 tests, build; main chunk 606 kB).
- `pnpm test:e2e`: 12 passed, including WCAG 2.1 A/AA axe scans. The scans caught real defects that were
  fixed: secondary-text contrast on the warm canvas (ink-400 darkened), a `div` with `aria-label` and no
  role, and mismatched control names.

**Not done / honest limits**

- Axe is automated only; no screen-reader or keyboard-only walkthrough has been done by a person.
- No clinician or receptionist has reviewed the new workflows; layout choices are reasoned, not tested with users.
- Dark theme not provided. Tablet (768 px) was reviewed only through the responsive rules, not screenshots.
- The registry has no filters beyond search and sort (the API offers none; adding them is a backend task).
- Dashboard "Expected" is rendered twice in the DOM for front-desk users to reorder it on small screens.

## Repository history note

The working tree was handed over with every tracked file of an earlier, unrelated LumenHealth
prototype deleted (uncommitted; Next.js/Express, Stellar anchoring service, mobile app). That work is
**intact in git history** (`HEAD` = `8130fb9`, and `origin/*` branches) and was not reset or restored
over. This build is a greenfield replacement on `greenfield/foundation`. Legacy files still present
and untouched: `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/labels.yml`,
`.github/stale.yml`, `.github/MAINTAINER_TRIAGE.md` (review them against the new structure).
`.github/workflows/lint.yml` and `pr-checks.yml` (npm-based, obsolete) were removed and `ci.yml` /
`security-scan.yml` rewritten for pnpm. `.gitignore` no longer ignores `.github/`.
No `LICENSE` file exists in the working tree; choose one deliberately before publishing.

**Nothing has been committed.** All changes are uncommitted on `greenfield/foundation`.

## What exists

| Area               | State                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo           | pnpm 11 workspaces: `apps/api`, `apps/web`, `packages/{contracts,ui,config}`. TypeScript 6 strict.                                                                                                                                                     |
| Database           | PostgreSQL 17 (Docker). Prisma 7 schema, 4 migrations, RLS on 12 tenant tables, composite tenant/patient foreign keys, exclusion + partial-unique constraints, immutability and audit triggers.                                                        |
| Identity           | Email + argon2id password; server-side sessions in an HttpOnly cookie; lockout; forced temporary-password change; static RBAC (4 roles, 18 permissions); org/branch context switching; staff admin.                                                    |
| Tenancy            | `organizationId` on every tenant row; every service query is org-scoped; every tenant transaction sets `app.current_org_id` for RLS; API runs as a non-owner role.                                                                                     |
| Patient registry   | Registration with MRN sequence, duplicate detection (name+DOB, phone+DOB; ID match is a hard block), server-side search/sort/pagination (trigram-indexed), optimistic-concurrency edits, emergency contacts, identifiers.                              |
| Scheduling         | Appointments, walk-ins, check-in, per-branch daily queue numbers, urgent-first queue, cancel/no-show with outcomes, DB-enforced no double-booking and one live visit per patient.                                                                      |
| Encounters         | Start (wrong-patient guard), vitals (entered-in-error), autosaved note, diagnoses (one primary), draft→active prescriptions, sign (explicit confirmation), addenda, close with disposition, void-as-error.                                             |
| Audit              | Append-only `audit_events` (app role cannot update/delete; trigger blocks the owner too); sensitive reads, writes, denials and sign-ins recorded without clinical content; admin audit-log screen.                                                     |
| Dashboard          | Counts, waiting room, upcoming, median wait: all real queries scoped to org + branch.                                                                                                                                                                  |
| Web app            | Application shell, dashboard, patients, schedule & queue, consultation workspace, staff, audit log, change password, design-system reference, Ctrl/⌘K patient search, derived notifications.                                                           |
| Design system      | `packages/ui`: Lumen Instrument tokens and ~60 components on Radix primitives (incl. DataTable, Pagination, Combobox, Drawer); fonts bundled locally; component tests (24); showcase at `/design-system`; WCAG 2.1 AA automated checks on key screens. |
| API docs           | Swagger UI at `/api/docs` (dev); `docs/api/openapi.json` exported.                                                                                                                                                                                     |
| CI                 | `.github/workflows/ci.yml` (quality, migrations+tests with Postgres service, Playwright e2e), `security-scan.yml` (pnpm audit). **Written but not yet run on GitHub** (nothing is pushed).                                                             |
| Payments / Stellar | **Not implemented.** Boundary designed in `docs/architecture/payments.md` and ADR 0006.                                                                                                                                                                |
| Offline            | **Not implemented.** Architecture note only; sync-ready identifiers and `version` columns exist.                                                                                                                                                       |

## Verified (summary table; session 3 detail above)

Run on macOS, Node 24.7, pnpm 11.15.1, Docker 29.5.2 (PostgreSQL 17):

| Check                                       | Result                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @lumen/contracts test`       | 15 passed                                                                                                         |
| `pnpm --filter @lumen/api test`             | 83 passed (9 files; real PostgreSQL, includes tenant-isolation, RBAC, workflow, DB-invariant tests)               |
| `pnpm --filter @lumen/web test`             | 22 passed (+ 24 in `packages/ui`)                                                                                 |
| `pnpm test:e2e` (Playwright, Chrome)        | 21 passed (journey, access control, cross-org, duplicate warning, registry paging/sort/search, axe WCAG 2.1 A/AA) |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | passing (see "Final verification" below for the last full run)                                                    |
| Backup → restore drill (pg_dump/pg_restore) | Row counts, 14 RLS policies and 9 triggers identical after restore (local, unencrypted)                           |

## Known issues and gaps

1. **Dev database needs a reset (still pending, yours to run).** The seed now adds 300 patients and the new migration adds indexes; the existing dev DB was half-seeded earlier. An early seed run failed part-way; `pnpm db:seed` reports "already present" on a populated database. `prisma migrate reset` is blocked for AI agents, so the owner should run `pnpm db:reset` (drops and recreates the _local_ `lumenhealth` database, then reseeds). The test and e2e databases are unaffected.
2. **Raw-SQL schema objects** (RLS, triggers, exclusion/partial indexes, CHECKs) are invisible to Prisma's diff; a careless `prisma migrate dev` would propose dropping them. See `docs/development/database.md` for the review rule. The integration tests would fail if any were lost.
3. **Prisma 7 / Nest 12 / Vite 8 / TypeScript 6** are recent majors; versions were chosen for verified compatibility (TS 7 is excluded: `@nestjs/swagger` and `typescript-eslint` require < 6.1). `@swc/core` is pinned to 1.16.17 via an override to respect pnpm's minimum-release-age protection.
4. No ICD-10 terminology service (free text + optional code format check); no allergy list (prescribing screens cannot warn about allergies yet); no drug catalogue/interaction checking. These are deliberately out of scope: no clinical decision support is implied.
5. Rate limiting is per-IP with an in-memory store (fine for one API instance; move to a shared store before scaling out). Login: 10/min/IP plus per-account lockout.
6. Notifications are derived live from the queue (urgent/long waits). There is no persisted notification system.
7. `branch` data (branches, memberships) is not under RLS because authentication needs it before an org context exists; it holds no clinical data.
8. No LICENSE, no CODE_OF_CONDUCT/CONTRIBUTING for the new structure.
9. Pagination is offset-based (see session 3 limits). 10. Web main chunk is ~605 kB (184 kB gzip) after route-level code splitting; vendor splitting (React, Radix, zod) is a further easy gain.

## Next actions (highest value first)

1. Owner: `pnpm db:reset --dry-run`, then `pnpm db:reset` (type `lumenhealth`), then `pnpm dev` and click through the demo; note anything that feels wrong for real clinic use.
2. Commit the work on `greenfield/foundation` and open a PR to `develop`; let CI run for the first time and fix anything environment-specific. Suggested order (nothing is staged except three pre-existing entries from the handed-over tree):
   1. prototype removal: `git ls-files -d -z | xargs -0 git rm --cached -q`
   2. tooling and CI: `git add .github .gitignore .env.example .nvmrc .prettierignore .prettierrc.json README.md docker-compose.yml infrastructure package.json pnpm-lock.yaml pnpm-workspace.yaml scripts packages/config`
   3. shared packages: `git add packages/contracts packages/ui`
   4. API: `git add apps/api`; 5. web: `git add apps/web`; 6. docs: `git add docs`
      Then `git status` should be clean (screenshots, `.env`, `dist/`, reports and the generated Prisma client are ignored). Decide on a LICENSE first: the handed-over tree had deleted it.
3. **Stage 3: payment foundations** (see `docs/ROADMAP.md`): invoices/charges tables, `PaymentProvider` contract, Stellar testnet verification with deterministic test doubles.
4. Stage 4 items: structured-log review in a deployed-like environment, per-endpoint rate limits review, production Docker image + reverse-proxy example, restore drill with encryption.
5. Add patient allergies (safety-critical before any prescribing aid) and a printable prescription/discharge summary.

## Exact stopping point (updated session 3)

The Design Rebuild 2 and the craft pass (session 4) are complete and verified as described above; nothing is committed. Next: run `pnpm db:reset`
and click through the app, review the diff, commit in coherent commits on `greenfield/foundation`, open the
foundation PR, then start Stage 3.

## Earlier stopping point (session 1)

All Stage 0–2 work is finished and tested. The next piece of work is to start Stage 3 with the
billing/payments data model and `PaymentProvider` interface; nothing for it has been written beyond
documentation.

## Final verification (end of session 1)

- `pnpm check` (format check → lint → typecheck → contracts 15 + web 14 + API 69 tests → build): **exit 0**.
- `pnpm test:e2e`: **12 passed** (Playwright, Chrome, disposable `lumenhealth_e2e` database re-created and re-seeded by the run).
- Manual check in a browser (desktop and a 375 px viewport): sign-in, dashboard, starting a consultation from the waiting room; no horizontal overflow on dashboard, patients, schedule, consultation pages.
- GitHub Actions workflows have **not** run (nothing pushed).
