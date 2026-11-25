# Payments and billing boundary

**Status: design only. Nothing here is implemented or claimed to work.** Milestone 3 implements the minimum for the pilot; Milestones 5, 6 and 8 extend it.

## Concepts (kept separate)

| Concept                   | Meaning                                                              | Owner              |
| ------------------------- | -------------------------------------------------------------------- | ------------------ |
| Charge item               | A priced service rendered (from encounter/order)                     | Billing            |
| Invoice / lines / balance | What the patient or payer owes (NGN, integer kobo)                   | Billing            |
| Payment intent            | A request to collect a specific amount for an invoice; has an expiry | Payments           |
| Payment attempt           | One try through one provider                                         | Payments           |
| Provider transaction ref  | The provider's identifier (e.g. Stellar tx hash, card processor id)  | Payments           |
| Verified settlement       | Server-side-confirmed receipt of funds matching an intent            | Payments           |
| Allocation                | Applying settled funds to invoices                                   | Payments → Billing |
| Refund / reversal         | Only where the rail supports it                                      | Payments           |
| Receipt                   | Immutable proof of a verified settlement, issued once                | Payments           |
| Financial audit event     | Append-only record of every money-affecting state change             | Payments           |

## State machines (explicit; enforced like the clinical ones: contract table + CAS + DB trigger)

- **Invoice:** `DRAFT → ISSUED → PARTIALLY_PAID → PAID`; `ISSUED|PARTIALLY_PAID → VOID` (with reason; before any settlement or via reversal).
- **Payment intent:** `CREATED → AWAITING_PAYMENT → SETTLED | EXPIRED | CANCELLED | UNDERPAID | OVERPAID(→SETTLED with excess flagged)`; late payment on an `EXPIRED` intent becomes a **suspense** settlement requiring staff review.
- **Settlement:** created only by the verification service; never edited.

## Invariants

- An invoice becomes paid only through a verified settlement written in a transaction that also updates the allocation and issues the receipt.
- Idempotency keys on intent creation and webhook/verification processing; `UNIQUE (provider, provider_transaction_ref)` on settlements; `UNIQUE (settlement_id)` on receipts: replays cannot duplicate money or receipts.
- Browser redirects, success pages and client-supplied transaction hashes are **claims**, never evidence; verification always re-queries the provider/network.
- Money is integer minor units (kobo) with an explicit currency; never floating point.
- Billing and clinical code import no provider code; providers import no clinical code.

## `PaymentProvider` contract (capability-based)

```ts
interface PaymentProvider {
  readonly id: string; // 'stellar', 'paystack', …
  readonly capabilities: { refunds: boolean; webhooks: boolean; polling: boolean /* … */ };
  createIntent(input): Promise<ProviderIntent>; // instructions to pay (address+memo / checkout url)
  verify(intentRef): Promise<VerificationResult>; // authoritative lookup; pure w.r.t. our DB
  refund?(settlementRef, amount): Promise<RefundResult>; // only if capabilities.refunds
}
```

A provider implements only what its rail supports. A deterministic test provider exists for automated tests and cannot be enabled in production configuration.

## Stellar adapter (planned: testnet first)

- Official `@stellar/stellar-sdk` and Horizon; **network is configuration** (`testnet` default). Production is a separate flag that stays **off** until: asset and issuer chosen and verified; NGN redemption/settlement route confirmed (not every Stellar asset is redeemable for naira); operational risks (custody, liquidity, key management) and regulatory requirements evaluated.
- Intent: unique payment reference as a **memo** (random, no patient data), destination account, accepted asset (code + issuer pair, never code alone), amount, expiry.
- Verification: fetch the transaction and its payment operations from Horizon; require `successful`, destination match, **asset code and issuer** match, amount ≥ expected (after the fixed quote), memo match, ledger close time within the intent window; detect duplicates by transaction hash + operation index; handle underpayment (stay open / partial), overpayment (settle, flag excess), late payment (suspense), expiry.
- Receiving keys: payments are **received** to a destination account; the application needs no signing key for receipt. Any signing key (refunds, sweeps) is held outside the web/API tier (HSM/KMS or multisig), never in the frontend or repository.
- NGN invoices settled in a Stellar asset need a documented quote source, fixed rate with expiry, fee handling, rounding and reconciliation rule; decided before Milestone 3 ships the UI.
- **Off-chain data only:** memos and references reveal no diagnoses, MRNs or patient identifiers.
- Tests: recorded Horizon fixtures for deterministic cases; a testnet test when reachable. Never depend on live availability in CI.
