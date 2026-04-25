# Privacy and Data Retention Baseline

> Version: 1.0.0 — CHORD-020
> Owner: Architecture & Standards
> Review trigger: new PII field, retention window change, export requirement, deletion behaviour change, or regulatory update

---

## Purpose

This document maps all personally identifiable information (PII) fields stored by LumenHealth, defines retention windows for each data category, and specifies the export and deletion behaviour required to support user rights requests. It applies to all workspaces in the monorepo.

---

## PII Field Inventory

### Users (Staff)

| Field | Collection | Classification | Notes |
|---|---|---|---|
| `name` | `users` | PII | Full name of staff member |
| `email` | `users` | PII | Login identifier |
| `passwordHash` | `users` | Sensitive | bcrypt hash — never returned in API responses |
| `role` | `users` | Internal | Not PII but access-sensitive |
| `clinicId` | `users` | Internal | Tenant scope |
| `createdAt` | `users` | Metadata | — |

### Patients

| Field | Collection | Classification | Notes |
|---|---|---|---|
| `firstName`, `lastName` | `patients` | PII / PHI | Patient identity |
| `dateOfBirth` | `patients` | PHI | Health-linked identifier |
| `gender` | `patients` | PHI | — |
| `phone` | `patients` | PII / PHI | Contact detail |
| `address` | `patients` | PII / PHI | — |
| `clinicId` | `patients` | Internal | Tenant scope |
| `createdAt` | `patients` | Metadata | — |

### Encounters

| Field | Collection | Classification | Notes |
|---|---|---|---|
| `patientId` | `encounters` | PHI reference | Links to patient record |
| `clinicId` | `encounters` | Internal | — |
| `claimedBy` | `encounters` | Internal | Staff userId |
| `status` | `encounters` | Internal | — |
| `createdAt`, `closedAt` | `encounters` | Metadata | — |

### Clinical Sub-resources (Vitals, Notes, Diagnoses)

All sub-resources inherit the PHI classification of their parent encounter. They contain clinical observations that are PHI by association.

### Payments

| Field | Collection | Classification | Notes |
|---|---|---|---|
| `clinicId` | `paymentIntents` | Internal | — |
| `amount`, `currency` | `paymentIntents` | Financial | Not PHI |
| `stellarTxHash` | `paymentIntents` | Financial | Public blockchain reference |

### Audit Logs

| Field | Collection | Classification | Notes |
|---|---|---|---|
| `userId` | `auditLogs` | PII reference | Actor identity |
| `clinicId` | `auditLogs` | Internal | — |
| `resourceId` | `auditLogs` | Internal | ID of affected record |
| `action` | `auditLogs` | Internal | — |
| `correlationId` | `auditLogs` | Internal | — |
| `createdAt` | `auditLogs` | Metadata | — |

Audit logs must never contain raw PII values (names, emails, phone numbers). Use IDs only.

---

## Retention Windows

| Data Category | Retention Period | Basis |
|---|---|---|
| Patient records | Lifetime of clinic account | Clinical necessity |
| Encounters and sub-resources | Lifetime of clinic account | Clinical necessity |
| User (staff) accounts | Lifetime of clinic account + 90 days | Operational |
| Refresh tokens | 30 days or until revoked | Security |
| Audit logs | Minimum 7 years | Regulatory |
| Payment intents | 2 years | Financial reconciliation |
| Subscriptions | 2 years after cancellation | Financial reconciliation |
| AI prompt logs | 90 days (disabled by default) | Debugging |
| Server access logs | 90 days | Infrastructure |
| Profile images / media | Lifetime of owning record | Operational |
| Orphaned media objects | 30 days | Storage hygiene |

---

## Deletion Behaviour

### Clinic Account Deletion

Clinic deletion is a high-risk, irreversible operation. It requires:

1. Explicit confirmation from a clinic `admin` user.
2. A 30-day grace period during which the account is suspended but data is retained.
3. After the grace period, all patient records, encounters, users, and media are hard-deleted.
4. Audit logs are retained for the full 7-year window even after clinic deletion.
5. Payment records are retained for 2 years.

### Patient Record Deletion

Individual patient records may not be hard-deleted while the clinic account is active. Deletion requests are handled by:

1. Marking the patient as `archived` (soft delete).
2. Excluding archived patients from all search and list results.
3. Retaining the record for the clinic lifetime retention window.
4. Hard deletion only occurs as part of a full clinic account deletion.

### User (Staff) Account Deletion

1. Revoke all active refresh tokens immediately.
2. Soft-delete the user record (set `deletedAt`).
3. Retain the record for 90 days for audit trail continuity.
4. Hard-delete after 90 days.
5. Audit log entries referencing the `userId` are retained.

### Right to Erasure (GDPR / NDPR)

For jurisdictions that require erasure of patient data on request:

1. The clinic admin submits an erasure request via the API.
2. The API soft-deletes the patient and all sub-resources.
3. A background job schedules hard deletion after a 30-day review window.
4. Audit logs referencing the patient ID are anonymised (replace `resourceId` with a hash).
5. The erasure event is itself logged in the audit trail.

---

## Data Export

### Patient Data Export

Clinics may request a full export of a patient's data:

- Format: JSON (structured) or PDF (human-readable summary).
- Scope: patient demographics, all encounters, vitals, notes, diagnoses.
- Delivery: secure download link with a 15-minute signed URL TTL.
- Audit: export request and download are logged.

### Clinic Data Export

Full clinic data export (all patients, encounters, staff) is available on request for account migration or regulatory audit. Delivery is via a secure, time-limited download.

---

## Privacy-Safe Engineering Rules

1. **No PII in logs.** Log statements must use IDs (`patientId`, `userId`) not names, emails, or phone numbers.
2. **No PII in test fixtures.** All test data must be synthetic. Use generated names and fake contact details.
3. **No PII in error messages.** API error responses must not echo back patient or user data.
4. **No PII in event payloads.** Domain events (see `docs/domain-event-schema.md`) carry IDs only.
5. **No PII in URLs.** Route parameters must use opaque IDs, not names or email addresses.
6. **Signed URLs are not logged.** Media access URLs must not appear in application logs.
7. **PHI fields are never returned in list responses.** Paginated lists return minimal fields; full PHI is only returned on single-record fetches with explicit auth.

---

## Workspace Responsibilities

| Workspace | Responsibility |
|---|---|
| `apps/api` | Enforce retention, deletion, and export logic; redact PII from logs |
| `apps/web` | Never cache PHI in localStorage or sessionStorage; clear on logout |
| `apps/stellar-service` | No PHI — payment data only; no patient identifiers |
| `packages/types` | Define PHI-annotated TypeScript interfaces |
| `packages/config` | Expose retention window constants; no PHI values |

---

## Review Checklist

When adding a new field or collection:

- [ ] Field added to the PII inventory with correct classification
- [ ] Retention window confirmed and documented
- [ ] Deletion behaviour defined
- [ ] Log statements use IDs, not PII values
- [ ] Test fixtures are synthetic
- [ ] ADR required if PHI handling or retention windows change
