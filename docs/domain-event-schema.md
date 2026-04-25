# Domain Event Naming and Payload Schema

> Version: 1.0.0 — CHORD-018
> Owner: Backend Platform
> Review trigger: new event type, payload field change, consumer added, or transport change

---

## Purpose

This document standardises the naming convention and payload envelope for all domain events emitted by LumenHealth. Consistent event schemas allow the frontend, background workers, and future integrations to consume events without per-event parsing logic.

---

## Event Naming Convention

Event names follow the pattern:

```
<domain>.<entity>.<past-tense-verb>
```

| Segment | Rules | Examples |
|---|---|---|
| `domain` | lowercase, matches module name | `encounter`, `payment`, `queue`, `auth` |
| `entity` | lowercase singular noun | `encounter`, `intent`, `user` |
| `past-tense-verb` | lowercase, describes what happened | `created`, `updated`, `closed`, `confirmed` |

Full examples: `encounter.encounter.created`, `payment.intent.confirmed`, `queue.entry.removed`, `auth.user.logged_in`

For brevity, when the domain and entity are the same word, the entity segment may be omitted:

- `encounter.created` (preferred over `encounter.encounter.created`)
- `payment.intent.confirmed` (domain ≠ entity, so both are kept)

---

## Envelope Schema

Every event, regardless of transport, wraps its payload in a standard envelope:

```ts
interface DomainEvent<T = unknown> {
  /** UUID v4 — unique ID for this event instance */
  eventId: string;
  /** Event name following the naming convention above */
  event: string;
  /** ISO 8601 UTC timestamp of when the event was emitted */
  occurredAt: string;
  /** Correlation ID inherited from the originating request or job */
  correlationId: string;
  /** Clinic scope — present on all tenant-scoped events */
  clinicId?: string;
  /** Domain-specific payload */
  data: T;
}
```

### Example — Encounter Created

```json
{
  "eventId": "a1b2c3d4-0000-0000-0000-000000000001",
  "event": "encounter.created",
  "occurredAt": "2026-04-25T11:00:00.000Z",
  "correlationId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "clinicId": "clinic_abc123",
  "data": {
    "encounterId": "enc_xyz789",
    "patientId": "pat_def456",
    "status": "open"
  }
}
```

---

## Canonical Event Catalogue

### Encounter Events

| Event | Trigger | Key `data` Fields |
|---|---|---|
| `encounter.created` | New encounter opened | `encounterId`, `patientId`, `status` |
| `encounter.claimed` | Provider claims encounter | `encounterId`, `claimedBy` (userId) |
| `encounter.closed` | Encounter closed | `encounterId`, `closedBy` (userId) |
| `encounter.vital.added` | Vital recorded | `encounterId`, `vitalId`, `type` |
| `encounter.note.added` | Note submitted | `encounterId`, `noteId` |
| `encounter.diagnosis.added` | Diagnosis attached | `encounterId`, `diagnosisId`, `icd10Code` |

### Queue Events

| Event | Trigger | Key `data` Fields |
|---|---|---|
| `queue.entry.added` | Encounter enters queue | `encounterId`, `patientId` |
| `queue.entry.removed` | Encounter claimed or closed | `encounterId` |

### Payment Events

| Event | Trigger | Key `data` Fields |
|---|---|---|
| `payment.intent.created` | Payment intent generated | `intentId`, `amount`, `currency` |
| `payment.intent.confirmed` | On-chain transaction verified | `intentId`, `stellarTxHash` |
| `payment.intent.expired` | Intent not confirmed within TTL | `intentId` |
| `payment.subscription.activated` | Subscription goes active | `subscriptionId`, `clinicId` |
| `payment.subscription.canceled` | Subscription canceled | `subscriptionId`, `clinicId` |

### Auth Events

| Event | Trigger | Key `data` Fields |
|---|---|---|
| `auth.user.logged_in` | Successful login | `userId`, `clinicId` |
| `auth.user.logged_out` | Explicit logout / token revoked | `userId` |
| `auth.user.created` | New staff account | `userId`, `clinicId`, `role` |

### AI Events

| Event | Trigger | Key `data` Fields |
|---|---|---|
| `ai.summary.requested` | Visit summary generation started | `encounterId`, `correlationId` |
| `ai.summary.completed` | Summary generation finished | `encounterId` |
| `ai.summary.failed` | Generation error | `encounterId`, `reason` |

---

## Transport Bindings

### Server-Sent Events (SSE)

SSE events use the standard `event:` / `data:` format. The `data` field is the full JSON envelope:

```
event: encounter.created
data: {"eventId":"...","event":"encounter.created","occurredAt":"...","correlationId":"...","clinicId":"...","data":{...}}
```

### In-Process (Node.js EventEmitter)

Internal events within `apps/api` use Node's `EventEmitter`. The event name is the full dot-notation string. The listener receives the full envelope object.

```ts
eventBus.emit('encounter.created', envelope);
eventBus.on('encounter.created', (e: DomainEvent<EncounterCreatedData>) => { ... });
```

### Future: Message Queue

When a message broker (e.g., Redis Streams, BullMQ) is introduced, the envelope schema remains unchanged. The event name becomes the queue/stream key.

---

## Versioning

- The envelope schema is versioned in `packages/types`.
- Adding a new optional field to `data` is additive and does not require a version bump.
- Removing or renaming a field, or changing a field type, requires a version bump and a changelog entry per `CONTRACT_VERSIONING.md`.
- Breaking changes must be announced to all consumers before merging.

---

## Review Checklist

When adding a new event:

- [ ] Name follows `<domain>.<entity>.<verb>` convention
- [ ] Payload uses the standard envelope
- [ ] Event added to the catalogue in this document
- [ ] `DomainEvent<T>` type exported from `packages/types`
- [ ] Consumers updated or notified
- [ ] `correlationId` is always populated
- [ ] No PHI in event payloads (use IDs, not names or contact details)
