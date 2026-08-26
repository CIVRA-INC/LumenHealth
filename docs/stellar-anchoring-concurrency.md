# Anchoring Transaction Concurrency Model

Every anchor transaction is submitted from the same shared Stellar account.
Stellar accounts use a strictly incrementing sequence number per
transaction — two transactions built concurrently against the same
account's current sequence number will race: whichever reaches Horizon
second fails with `tx_bad_seq`. Worse, two independent anchoring attempts
that both fetch "currently unanchored" entries before either has persisted
a result can each anchor the same entry under a different transaction.

## What causes concurrent submissions

- **Overlapping scheduler ticks.** `AnchoringScheduler` runs `tick()` on a
  fixed interval (`setInterval`). If a tick is still awaiting a slow
  Horizon call when the next interval fires, the scheduler would — without
  the guard below — start a second `tick()` while the first is still
  in-flight.
- **Multiple anchoring paths sharing one account.** A routine batch job and
  any path that anchors outside the routine cycle (e.g. anchoring a
  governance-critical action immediately) both submit against the same
  account. If they run as separate `AnchoringService` instances, no
  in-process safeguard can serialize between them.

## How it's handled

1. **`AnchoringScheduler` skips a tick if the previous one is still
   running** (`isTicking`). This is a cheap, early guard that avoids piling
   up redundant fetch/build work — not the actual safety mechanism.

2. **`AnchoringService` serializes every submission-affecting call**
   (`runBatch`, `flushPendingPersists`) onto a single internal promise
   queue (`serialize()`). Two overlapping calls on the *same instance*
   never build or submit a transaction concurrently — the second always
   waits for the first to fully settle (submit + persist) before it even
   re-fetches "unanchored" entries. This is what actually prevents both the
   sequence-number race and the double-anchor race, for anything that
   shares one instance.

3. **This only protects one process.** The queue lives in one
   `AnchoringService` object's memory — it cannot serialize submissions
   made by a *different* `AnchoringService` instance in a different
   process. The practical fix is architectural: consolidate every path that
   submits against the anchor account into one persistent process sharing
   one `AnchoringService` instance, rather than running the scheduler and
   any other submission path as separate processes. Once that's true, the
   queue in (2) covers the whole account.

4. **A stray `tx_bad_seq` still self-heals.** `submitMerkleRoot()` always
   reloads the account (and therefore its current sequence number) fresh on
   every attempt — including retries — rather than tracking a sequence
   number client-side. So even in the rare case a rejection does reach
   Horizon (e.g. during a deploy where two processes briefly overlap), the
   default retry policy treats it as retryable and the next attempt reloads
   a correct sequence number and succeeds, rather than needing a human to
   intervene.

## Verifying this

`apps/stellar-service/src/__tests__/anchoring.test.ts` ("concurrent call
serialization") and `scheduler.test.ts` ("skips a tick entirely if the
previous one is still running") assert this directly: two overlapping
`runBatch()` calls never interleave their `submitTransaction` calls, and a
second overlapping call re-fetches after the first has persisted, so it
finds nothing left to re-anchor.
