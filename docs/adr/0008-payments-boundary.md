# ADR 0008: Payments provider boundary

**Status:** accepted (design only; **not implemented**) · **Date:** 2026-10-23

## Decision

Billing owns charges, invoices and balances and knows nothing about any payment rail. A separate Payments domain owns payment intents, attempts, provider transaction references, verified settlements, refunds, allocation and receipts. Providers implement a small `PaymentProvider` contract with **capability flags**; a provider implements only what its rail genuinely supports (for example, no assumption of reversible refunds). Stellar is a first-class adapter alongside conventional providers.

Invariants: an invoice is marked paid only from a **verified settlement** created server-side from authoritative provider data; client redirects and claimed transaction hashes are never trusted; settlement and receipt issuance are guarded by idempotency keys and unique constraints inside database transactions; clinical and patient-identifying data never go on-chain.

Production Stellar settlement stays disabled until the asset, the NGN redemption/settlement route, operational risks and regulatory position are evaluated. Details: `architecture/payments.md`.

## Consequences

Adding a provider later is additive. Nothing about payments is claimed to work today.
