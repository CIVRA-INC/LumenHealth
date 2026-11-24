# Domain boundaries

| Domain                                     | Module / status                        | Owns                                                                        | Exposes to others                                                                |
| ------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Identity and access control                | `modules/identity` ✅                  | users, sessions, memberships, passwords, lockout, RBAC enforcement          | `RequestContext`, guards                                                         |
| Organizations, branches, departments       | `modules/organizations` ✅             | organisations, branches, departments, clinician directory                   | read endpoints                                                                   |
| Patient registry                           | `modules/patients` ✅                  | patients, identifiers, emergency contacts, MRN sequence, duplicate rules    | `toPatientSummary` mapper                                                        |
| Scheduling and queues                      | `modules/scheduling` ✅                | appointments, walk-ins, check-in, queue numbers, appointment state machine  | appointment mapper; `COMPLETED`/`CHECKED_IN` transitions requested by encounters |
| Clinical encounters and documentation      | `modules/encounters` ✅                | encounters, notes, vitals, diagnoses, medication orders, addenda, lifecycle | encounter views                                                                  |
| Diagnoses, observations, medication orders | within `encounters` ✅                 | (as above; split out when laboratory/pharmacy arrive)                       | —                                                                                |
| Billing                                    | ⬜ Milestone 3/5                       | charges, invoices, balances                                                 | invoice read model                                                               |
| Payments and provider integrations         | ⬜ Milestone 3 (design: `payments.md`) | intents, attempts, settlements, receipts, `PaymentProvider` adapters        | settlement events to Billing                                                     |
| Audit and compliance                       | `modules/audit` ✅                     | `audit_events`, audit read API                                              | `AuditService.record*` (global)                                                  |
| Integrations and reporting                 | ⬜ later                               | FHIR export, operational reports                                            | —                                                                                |

## Rules

- A module's controllers call that module's services. Services read another domain's data only through its exported mapper/service, never by writing to its tables. (Today the only cross-module writes are in `encounters`, which moves the linked **appointment** through its state machine inside the same transaction: documented in ADR 0006 and covered by tests. If this grows, replace it with an explicit `SchedulingService` method.)
- No circular module dependencies. `audit`, `database` and `config` are global leaf modules.
- Billing and payments will not import clinical modules; they will consume a narrow "billable event" (encounter id, patient id, service codes) published from encounters.
- Database constraints, not only code, protect each domain's invariants (see `data-model.md`).
