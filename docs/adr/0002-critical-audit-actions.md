# ADR 0002: Which audit actions are governance-critical (immediate anchoring)

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** LumenHealth backend maintainers
- **Related:** #1323, [ADR 0001](0001-nestjs-module-boundaries.md)
- **Supersedes:** nothing (it codifies the list that lived in `packages/types/src/audit.ts`)

## Context

Two lists decided which audit entries get anchored to Stellar *immediately*
(one single-entry transaction right after the action) versus *batched*
(queued until the next scheduled Merkle batch):

| Source | Contents |
| --- | --- |
| `CRITICAL_AUDIT_ACTIONS` (`packages/types/src/audit.ts`) | `staff.role_changed`, `clinic.archived` |
| private `CRITICAL_ACTIONS` inside `audit.service.ts` | `staff.invited`, `staff.invitation_revoked`, `staff.archived`, `clinic.archived` |

The two disagreed, so the type-level promise and the runtime behaviour were
not the same thing. Worse, `staff.archived` is not a member of `AuditAction`
at all, so the runtime list contained an action the system can never emit
(and did not include `staff.role_changed`, which it can and does).

Immediate anchoring is not free: every critical action becomes its own
Stellar transaction (Horizon submission, fee, round-trip latency, and a
retry/failure surface per action), while batched entries stay provably
un-anchored until the next batch window closes. The backlog asks for a
decision, with rationale, on the candidates: invitation send/revoke/accept,
owner changes, export generation, lockouts and permission changes — and
what the cost/latency trade-off is.

## Decision

### 1. Three questions decide membership

An action is **critical (immediate)** only when all three hold:

1. it **grants or alters privilege** (or destroys the tenant's world),
2. it is **irreversible or hard to unwind** within one batch window, and
3. an un-anchored gap around it **would be exploitable** — an insider could
   act and the "nothing happened" window could not be disproven from
   on-chain evidence.

If any answer is no, the action stays **batched**.

### 2. Membership for actions that exist today

| Action | Mode | Rationale |
| --- | --- | --- |
| `staff.role_changed` | **immediate** | Grants privilege (question 1 ✓). A role change that sits un-anchored is exactly the event an insider would want to be able to deny. Keep (was already type-level critical). |
| `clinic.archived` | **immediate** | Org-level destruction, effectively irreversible. Keep. |
| `staff.invitation_accepted` | **immediate (new)** | The moment a new principal's access comes into existence. Sending an invite is intent; accepting it is the privilege grant. |
| `staff.invited` | batched | No access yet; the invite can be revoked; high enough volume that one transaction each is wasted spend. Was incorrectly immediate in the runtime list. |
| `staff.invitation_revoked` | batched | Removes access rather than granting it; the revocation itself is recorded and lands in the next batch within minutes. |
| `staff.deactivated` / `staff.reactivated` | batched | Operational lifecycle churn; short batch window is acceptable. |
| `clinic.updated` | batched | Frequent, mostly low-sensitivity field edits (name, contact, settings). |
| `auth.password_reset_requested` / `_completed` | batched | Already rate-limited and emailed; the recovery flow is the control, not the anchor. |
| `batch.anchored` | batched | Anchoring the anchor record immediately would recurse; this action *is* the batching signal. |

### 3. Pre-decided stance for actions that do not exist yet

To keep from re-litigating this per PR, when these actions are introduced
they join the list (or not) as follows — adding the action string to
`AuditAction` alone never makes it critical:

| Future action | Mode | Rationale |
| --- | --- | --- |
| owner transfer/change | **immediate** | Ultimate privilege; same test as a role change, stronger. |
| permission change | **immediate** | Directly alters privilege. |
| account lockout | **immediate** | Adversarially useful (locking an owner out hides follow-on activity); an un-anchored lockout window is exactly question 3. |
| export generation | batched | Read-only side effect, high volume, and the export is independently signed and verifiable anyway. |

### 4. Unknown actions default to batched

`isCriticalAuditAction` accepts an arbitrary string and returns `false`
unless the action is listed in `CRITICAL_AUDIT_ACTIONS`. Fail-open toward
the cheap, safe path: a typo or a newly introduced action must never
silently cost one Stellar transaction per occurrence. Making an action
critical requires editing `CRITICAL_AUDIT_ACTIONS` **and** amending this
ADR.

### 5. One source of truth

`apps/api`'s audit service now imports `isCriticalAuditAction` from
`@lumen/types` instead of keeping a private list. This removes the
divergence and, as a direct side effect, removes the invalid
`"staff.archived"` entry that the runtime list contained (a pre-existing
type error in `audit.service.ts` resolves with this change).

Expected steady-state immediate volume under this membership: low single
digits per day for a typical clinic (role changes, clinic archival,
invitations accepted) — each still worth its own transaction. If immediate
volume ever grows to where per-action anchoring dominates the batch
economy, coalescing consecutive critical actions into one transaction is
the next lever (out of scope here).

## Consequences

- The runtime list and the public type list agree; tests in
  `packages/types/src/__tests__/critical-actions.test.ts` pin membership,
  the future-action stance and the default-to-batched rule.
- `staff.role_changed` now takes the immediate path in the runtime
  (previously only the type said so); `staff.invited` and
  `staff.invitation_revoked` no longer do.
- A new `AuditAction` string can be added without touching anchoring
  behaviour, but changes membership only through this ADR.
- The coverage matrix in `docs/audit-coverage-matrix.md` references these
  modes for the routes that emit the actions above.
