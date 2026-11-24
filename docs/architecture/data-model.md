# Data model

Source: `apps/api/prisma/schema.prisma` plus the raw-SQL migrations. All tenant rows carry `organizationId`.

```
Organization 1─* Branch 1─* Department
Organization 1─* Membership *─1 User         (role per organisation)
Membership *─* Branch                         (MembershipBranch: where they may work)
User 1─* Session (token hash, active membership+branch)

Organization 1─* Patient 1─* PatientIdentifier / EmergencyContact
Patient 1─* Appointment 0..1─1 Encounter
Encounter 1─0..1 ClinicalNote
Encounter 1─* VitalSigns / Diagnosis / MedicationOrder / Addendum
Organization 1─* AuditEvent (append-only) ; Counter (MRN, daily queue numbers)
```

## Keys and sync metadata

UUIDv7 ids (ADR 0007); `version` on patients, appointments, encounters; `createdAt`/`updatedAt` UTC; creator/updater user ids on patients; `organizationId` everywhere.

## Constraints that carry business rules

| Rule                                                                     | Mechanism                                                                                                                                                                  |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rows cannot link across organisations or patients                        | Composite FKs `(id, organizationId[, patientId])`                                                                                                                          |
| Tenant visibility                                                        | RLS policy `tenant_isolation` on 12 tables; `audit_read_own_org` / `audit_insert`                                                                                          |
| MRN unique per organisation; same ID document is the same person         | `UNIQUE (organizationId, mrn)`; `UNIQUE (organizationId, type, value)` on identifiers                                                                                      |
| A clinician cannot hold overlapping live appointments; nor can a patient | `EXCLUDE USING gist` on `tstzrange(scheduledStart, scheduledEnd)` (needs `btree_gist`)                                                                                     |
| One live visit (waiting/in consultation) per patient                     | partial unique index on `appointments("patientId") WHERE status IN (…)`                                                                                                    |
| Valid appointment/encounter transitions                                  | triggers `enforce_appointment_transition`, `enforce_encounter_transition`                                                                                                  |
| Signed documentation is immutable                                        | trigger `enforce_encounter_unlocked` on notes, vitals, diagnoses, orders                                                                                                   |
| Addenda only on signed encounters; never edited                          | trigger `enforce_addendum_rules`                                                                                                                                           |
| One primary diagnosis per encounter                                      | partial unique index                                                                                                                                                       |
| Plausible vitals; at least one measurement                               | CHECK constraints                                                                                                                                                          |
| Signed/closed/void encounters carry their audit fields                   | CHECK constraints                                                                                                                                                          |
| Audit trail cannot be altered                                            | REVOKE UPDATE/DELETE/TRUNCATE + trigger                                                                                                                                    |
| Removing a clinical row is limited                                       | `lumen_app` has `DELETE` only on sessions, membership_branches, emergency_contacts, diagnoses, medication_orders (draft removal; the lock trigger blocks it after signing) |

## Not yet modelled

Allergies, problem list, orders other than medication, results, documents (object storage), billing/payments, sync change-log.
