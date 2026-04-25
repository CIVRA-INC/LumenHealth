# Non-Functional Requirements

> Version: 1.0.0 — CHORD-016
> Owner: Architecture & Standards
> Review trigger: new performance budget, SLA change, or infrastructure scaling decision

---

## Purpose

This document sets the initial non-functional requirements (NFRs) for LumenHealth covering latency, availability, reliability, and data retention. These targets apply to the production environment and inform architecture decisions, load testing thresholds, and incident response criteria.

---

## Latency Budgets

### API Response Times (p95, under normal load)

| Endpoint Category | Target p95 | Notes |
|---|---|---|
| Auth (login, refresh) | ≤ 300 ms | Includes JWT signing |
| Patient read (single record) | ≤ 200 ms | MongoDB indexed query |
| Patient search | ≤ 500 ms | Text index or regex query |
| Encounter create | ≤ 400 ms | Includes audit log write |
| Encounter read | ≤ 200 ms | Single document fetch |
| Queue board fetch | ≤ 300 ms | Aggregation over open encounters |
| Vitals / notes / diagnoses write | ≤ 400 ms | Includes audit log write |
| Payment intent create | ≤ 600 ms | Includes Stellar service call |
| Payment confirmation poll | ≤ 1 000 ms | Network round-trip to Stellar testnet |
| AI visit summary (streaming start) | ≤ 2 000 ms | Time to first token from Gemini |
| Diagnosis ICD-10 search | ≤ 300 ms | In-memory or indexed lookup |

### Frontend Page Load (Largest Contentful Paint)

| Route | Target LCP | Notes |
|---|---|---|
| `/login` | ≤ 1.5 s | Static-heavy page |
| `/dashboard` | ≤ 2.5 s | Requires auth + clinic data fetch |
| `/dashboard/queue` | ≤ 2.5 s | Requires SSE connection setup |
| `/dashboard/patients` | ≤ 2.5 s | Paginated list |
| `/dashboard/encounters` | ≤ 3.0 s | Encounter timeline |

---

## Availability and Uptime

| Component | Target Uptime | Measurement Window |
|---|---|---|
| `apps/api` | 99.5% | Rolling 30 days |
| `apps/web` | 99.5% | Rolling 30 days |
| `apps/stellar-service` | 99.0% | Rolling 30 days |
| MongoDB (Atlas or self-hosted) | 99.9% | Per provider SLA |

Planned maintenance windows are excluded from uptime calculations. Maintenance must be announced at least 24 hours in advance.

---

## Transaction Reliability

### Payment Flow

| Requirement | Target |
|---|---|
| Payment intent creation success rate | ≥ 99% |
| Stellar transaction confirmation latency (testnet) | ≤ 10 s after submission |
| Duplicate payment prevention | 100% — enforced by idempotency key |
| Payment intent expiry window | 15 minutes from creation |
| Confirmation retry attempts before marking expired | 3 attempts with exponential backoff |

### Encounter Writes

| Requirement | Target |
|---|---|
| Encounter create success rate | ≥ 99.9% |
| Audit log write success rate | 100% — audit failure must block the mutation |
| Encounter data loss on API restart | 0 — MongoDB write concern `majority` required |

---

## Queue and Real-Time Updates

| Requirement | Target |
|---|---|
| Queue board SSE fanout latency | ≤ 2 s from encounter state change to client update |
| Maximum concurrent SSE connections per server instance | 500 |
| Queue board stale data tolerance | ≤ 5 s |

---

## Data Retention

| Data Category | Retention Period | Notes |
|---|---|---|
| Patient records | Indefinite (clinic lifetime) | PHI — never hard-deleted |
| Encounters | Indefinite (clinic lifetime) | Append-only, never deleted |
| Audit logs | Minimum 7 years | Regulatory requirement |
| Refresh tokens | 30 days or until revoked | Purged by scheduled job |
| Payment intents (expired) | 2 years | For reconciliation |
| AI prompt logs | 90 days | Configurable; disabled by default |
| Server access logs | 90 days | Infrastructure-level retention |

---

## Security NFRs

| Requirement | Target |
|---|---|
| JWT access token TTL | 15 minutes |
| JWT refresh token TTL | 30 days |
| Password hashing | bcrypt, cost factor ≥ 12 |
| HTTPS enforcement | All production traffic; HTTP redirects to HTTPS |
| Rate limiting (auth endpoints) | ≤ 10 requests / minute per IP |
| PHI in logs | Prohibited — all log statements must redact patient identifiers |

---

## Scalability Targets (Sprint 1 Baseline)

These are the initial targets for the MVP / demo environment. They will be revised as the platform scales.

| Metric | Sprint 1 Target |
|---|---|
| Concurrent active clinics | 10 |
| Concurrent API requests | 100 req/s |
| Patients per clinic | ≤ 10 000 |
| Encounters per patient | ≤ 500 |
| MongoDB document size (encounter) | ≤ 64 KB |

---

## Monitoring and Alerting

| Signal | Alert Threshold | Severity |
|---|---|---|
| API p95 latency | > 1 000 ms for 5 minutes | Warning |
| API error rate (5xx) | > 1% over 5 minutes | Critical |
| MongoDB connection pool exhaustion | > 80% utilization | Warning |
| Stellar service unavailable | > 30 s | Critical |
| Audit log write failure | Any | Critical |
| Disk usage (MongoDB host) | > 80% | Warning |

Alerts must route to the on-call channel. Critical alerts require acknowledgement within 15 minutes.

---

## Review Checklist

When proposing a change that affects NFRs:

- [ ] Update the relevant table in this document
- [ ] Confirm load test or benchmark data supports the new target
- [ ] Update monitoring thresholds to match
- [ ] ADR required if the change affects PHI retention or security guarantees
- [ ] Notify dependent teams (frontend, blockchain, AI) if their budgets are affected
