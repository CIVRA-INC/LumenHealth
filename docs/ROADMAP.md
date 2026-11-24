# Roadmap

Status key: ✅ done and verified · 🟡 partly done · ⬜ not started. Each milestone lists acceptance
criteria; a milestone is done only when all are met and tested (see Definition of done in
[`PROJECT_STATE.md`](PROJECT_STATE.md)).

## Milestone 0: Foundation ✅

- pnpm monorepo, strict TypeScript, ESLint, Prettier, Vitest, Playwright, Docker Compose, CI definition.
- Prisma + PostgreSQL migrations; validated environment; structured logging; consistent error envelope; OpenAPI.
- Design tokens and component library with a reference page.
- Documentation system (`docs/`).

## Milestone 1: Application shell and identity ✅

- Sign-in/out with server-side sessions; lockout; forced password change; role-based permissions.
- Organisations, branches, departments, memberships; tenant isolation in API and database (RLS).
- Staff administration; audit trail and viewer.
- Dashboard backed by real queries; reproducible synthetic seed.

## Milestone 2: Outpatient clinical workflow ✅

- Patient registration, duplicate detection, search, edit.
- Appointments, walk-ins, queue, check-in, outcomes, invalid transitions blocked.
- Encounters with vitals, notes, diagnoses, prescriptions; sign, addenda, close, void.
- Automated tests for the whole journey (API integration, Playwright), including cross-tenant and RBAC denial.

## Milestone 2b: Interface redesign ✅ (session 2)

Distinct visual identity, role-aware Today workspace, search-first registry, document-style consultation
workspace, workflow-grouped schedule, guarded forms. Acceptance met: real-browser review at three sizes,
axe WCAG 2.1 A/AA scans, e2e journeys green. **Follow-ups:** assistive-technology walkthrough, clinician and
front-desk usability sessions, tablet pass, dark theme, registry filters (needs API).

## Milestone 2c: Design Rebuild 2 and real tables ✅ (session 3)

"Lumen Instrument" identity, a documented component library (`development/design-system.md`), a shared
DataTable with URL-held state, and real server-side pagination, sorting and search on patients, staff,
audit and consultations. Acceptance met: pagination API tests (including tenant isolation and every sort
order), UI component tests, 21 e2e including axe, real-screen review at three sizes. **Follow-ups:** keyset
pagination if lists outgrow offsets, richer audit filters (actor, date range), saved table views, column
visibility, usability sessions, dark theme, tablet pass, vendor chunk splitting.

## Milestone 2d: Product design craft pass ✅ (session 4)

Consultation workspace rebuilt as a clinical document, registry table craft (wrapping names, stable columns,
quiet row menus, phone page size), Today hierarchy and day-ruler legibility. Follow-ups: usability sessions on the
consultation layout, assistive-technology walkthrough, dark theme, tablet pass.

## Milestone 2e: Foundation handoff ✅ (session 6)

Guarded `db:reset`, repeatable disposable databases for e2e, visual review and API tests, atomic seed, verified
demo logins, setup and testing documentation. Remaining before Milestone 3: the owner resets the development database,
commits the foundation branch in coherent commits and opens the PR so CI runs for the first time.

## Milestone 3: Payment foundations ⬜ (next)

Acceptance criteria:

- [ ] `ChargeItem`, `Invoice`, `InvoiceLine`, `PaymentIntent`, `PaymentAttempt`, `Settlement`, `Receipt`, `FinancialAuditEvent` tables with explicit state machines, idempotency keys and uniqueness constraints (see `architecture/payments.md`).
- [ ] `PaymentProvider` contract with capability flags; a deterministic test provider for tests only (cannot be enabled in production config).
- [ ] `StellarPaymentProvider` (official `@stellar/stellar-sdk`): testnet only; asset+issuer validation; intent expiry; server-side Horizon verification of destination, asset, issuer, amount and memo; duplicate-transaction detection; under/over/late payment handling; reconciliation job.
- [ ] Integration tests: repeated requests never double-settle; a client-claimed transaction hash is never trusted; Stellar verification tested against recorded Horizon responses and, where reachable, live testnet.
- [ ] Production Stellar settlement explicitly disabled by configuration; decision record on asset/redemption route for NGN.
- [ ] Minimum invoice UI: create from encounter charges, view balance, record verified payment.

## Milestone 4: Pilot readiness 🟡

- [x] Backup → restore drill performed locally (row counts, policies, triggers verified).
- [x] Automated accessibility (axe, WCAG 2.1 A/AA) on sign-in, dashboard, patients, schedule, registration, encounter, design system.
- [ ] Concurrency tests beyond current coverage (simultaneous check-in, concurrent edits across sessions).
- [ ] Encrypted backup procedure and scheduled backups in a deployed environment; restore time recorded.
- [ ] Production container images, reverse proxy (TLS, same-origin web+API), secrets management guidance.
- [ ] Log review in a deployed-like environment confirming no PHI/credentials appear.
- [ ] Usability pass with clinicians and front-desk staff on the redesigned workflows; fix list.
- [ ] Production-readiness checklist signed off (`development/production-readiness.md`).
- [ ] Patient allergies; printable prescription and discharge summary.
- [ ] Legal/regulatory review for the operating jurisdiction (see `architecture/privacy-and-compliance.md`).

## Milestone 5: Comprehensive billing ⬜

Price lists in NGN, charge capture from orders/encounters, invoices, balances, adjustments and
write-offs with approval, receipts, accounts receivable reporting, insurance/HMO claims groundwork.
_Acceptance:_ full invoice lifecycle with reversals; ledger reconciles to payments; period reports.

## Milestone 6: Conventional payment providers ⬜

Paystack/Flutterwave (or equivalent) adapters on the same `PaymentProvider` contract; webhook
verification with signature + idempotency; refunds only where the rail supports them.
_Acceptance:_ provider conformance test suite passes for each adapter.

## Milestone 7: Operational modules ⬜

Laboratory orders/results, pharmacy dispensing and stock, inventory, reporting (operational charts
that answer real questions), interoperability (FHIR export, HL7 where required).

## Milestone 8: Production Stellar settlement ⬜

Only after the asset, redemption/settlement route, operational risks and regulatory position are
evaluated and documented. Includes signing-key custody design (no keys in the app tier), quote
source/expiry/fees/rounding rules for NGN invoices, and reconciliation against the chain.

## Milestone 9: Facility-LAN offline operation ⬜

Facility-local server with cloud synchronisation (see `architecture/offline-sync.md`).
_Acceptance (tests required before claiming offline support):_ multiple connected computers,
interrupted connectivity, duplicate operations, conflicts, restart and recovery, eventual
convergence; payments never shown as settled without authoritative verification.
