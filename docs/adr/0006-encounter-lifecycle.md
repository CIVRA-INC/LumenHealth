# ADR 0006: Encounter lifecycle and immutability

**Status:** accepted · **Date:** 2026-10-23

## Decision

`IN_PROGRESS` (drafts, autosaved) → `FINALIZED` (signed by the attending; locked) → `CLOSED` (disposition recorded); `IN_PROGRESS` → `ENTERED_IN_ERROR` (reason required; appointment returns to the queue).

- Signing needs a chief complaint and a primary diagnosis, an explicit confirmation, and activates draft medication orders atomically.
- After signing, a database trigger rejects changes to the note, vitals, diagnoses and medication orders (the only exception: an active order may be cancelled with a reason). Corrections are **addenda**: append-only, attributed, timestamped.
- Starting an encounter requires `expectedPatientId` to match the appointment's patient (wrong-patient guard); concurrent starts are resolved by compare-and-set (one succeeds, one gets 409).
- State transitions are enforced in three places: the shared state-machine table (used by UI and API), compare-and-set updates, and database triggers.

## Consequences

The clinical record cannot be silently altered through any code path. Voiding is limited to drafts; correcting a signed record always leaves a trail.
