# Production-readiness checklist and remaining gaps

Legend: ✅ in place and tested · 🟡 partly · ⬜ not done. Prioritised: **P0** blocks any real-patient use, **P1** before pilot go-live, **P2** soon after.

## P0

- ⬜ Legal/regulatory review and data-processing basis for the operating jurisdiction (`architecture/privacy-and-compliance.md`).
- ⬜ Multi-factor authentication for clinical and admin roles.
- ⬜ TLS-terminated deployment with same-origin web+API, `SESSION_COOKIE_SECURE=true`, `SWAGGER_ENABLED=false`, `TRUST_PROXY` set correctly.
- ⬜ Production database provisioning: separate `lumen` / `lumen_app` roles (non-superuser owner is fine; app role must not own tables or have `BYPASSRLS`), `btree_gist` available, network-restricted.
- ⬜ Encrypted, scheduled backups with a restore drill in the real environment.
- ⬜ Secrets in a secret manager; no shared demo credentials anywhere; seed never run.

## P1

- 🟡 Audit coverage reviewed with a clinician/compliance lead (current: reads of patient/encounter data, writes, denials, sign-in); add alerting on unusual access.
- ⬜ Production container images, health-check wiring, graceful shutdown verified under load, log shipping with PHI-free review.
- ⬜ Shared-store rate limiting if more than one API instance runs.
- ⬜ Idle-timeout UX (warning before expiry) and password policy review (breached-password check).
- ⬜ Patient allergies; printable prescription and discharge summary.
- ⬜ Usability pass with real clinicians on synthetic data.
- 🟡 Concurrency review (covered: concurrent registration, concurrent encounter start, stale updates; add concurrent check-in/cancel).
- ⬜ Dependency and image scanning in CI beyond `pnpm audit`.

## P2

- 🟡 Bundle size: routes are lazy-loaded (main chunk ~607 kB); split vendor chunks next.
- ⬜ Data retention and export tooling; patient access requests.
- ⬜ Dark theme and further accessibility audit with assistive technology (automated checks only so far).
- ⬜ Reporting that answers operational questions (throughput, waiting time trends).
