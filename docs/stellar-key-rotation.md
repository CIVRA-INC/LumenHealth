# Stellar Signing Key Rotation Procedure

This runbook defines the rotation path for the two Stellar signing roles in
`apps/stellar-service`: **anchor cosigners** (authorize on-chain
`manageData` anchor transactions) and the **export-signing key** (attests
compliance-export manifests). They are deliberately separate keys — a
leaked key for one role must not be usable to forge the other.

## Scope
- Anchor cosigner secrets (`STELLAR_ANCHOR_COSIGNER_SECRETS`)
- The shared anchor account's configured signer weights/thresholds (on-chain, via `buildMultisigSetupOperations`)
- Export-signing secret (`STELLAR_EXPORT_SIGNING_SECRET`)
- The signing key registry (`STELLAR_SIGNING_KEY_REGISTRY_JSON`)

## Why rotation doesn't break old exports

Every previously-issued `AuditExportBundle` embeds the public key that
signed it (`signingPublicKey`). Verification (`verifyExportBundle`,
`verify-export` CLI, the hosted verification portal) checks a bundle's
signature against *that* embedded key, not against "whatever key is
currently configured" — so an old export stays independently verifiable
after rotation, as long as the rotated-out key's record in the registry
still covers the timestamp it was signed at (`manifest.generatedAt`).

This is what the registry (`SigningKeyRecord[]`, `@lumen/types`) is for:
each entry is `{ publicKey, role, validFrom, validTo? }`. Rotating a key
means **closing out its old record with a `validTo`** and **adding a new
record for the new key** — never deleting old records.

## Rotating the export-signing key

1. Generate a new Stellar keypair for the new export-signing key. Store the
   secret in the platform secret manager; do not log it.
2. Add a new record to the signing key registry for the new public key,
   `role: "export-signing"`, `validFrom` set to the cutover instant.
3. Close out the outgoing key's record: set its `validTo` to the same
   cutover instant.
4. Deploy `STELLAR_EXPORT_SIGNING_SECRET` = the new secret, and
   `STELLAR_SIGNING_KEY_REGISTRY_JSON` = the updated registry (both old and
   new records present), to `apps/stellar-service`.
5. Verify: request a fresh compliance export (`GET /api/v1/audit/export`)
   and run it through `verify-export` (or the hosted portal) with the
   updated registry — `signatureValid` and `signingKeyAuthorized` should
   both be `true`.
6. Re-verify an export generated *before* rotation, using the same updated
   registry — it must still report `signingKeyAuthorized: true`, proving
   the old key's validity window still covers it.
7. Audit: capture rotation timestamp, operator, and the old/new public keys
   in ops notes.

## Rotating an anchor cosigner

Anchor cosigner rotation is on-chain, not just config — the shared anchor
account's signer list has to change too, which needs the *current* quorum
of cosigners to authorize (that's the point of multisig: no single party,
including whoever's rotating, can do this alone).

1. Generate the new cosigner's keypair.
2. Build a `setOptions` transaction adding the new signer at the intended
   weight, using `buildMultisigSetupOperations` (or a hand-built
   equivalent) against the shared anchor account.
3. Collect the current quorum's signatures on that transaction (same
   mechanism `AnchoringService`/`collectSignatures` uses for anchor
   transactions) and submit it.
4. Once confirmed, build a second `setOptions` transaction removing the
   outgoing cosigner (weight 0) — again requiring current-quorum
   signatures, which should now include the new signer if the threshold
   allows.
5. Update `STELLAR_ANCHOR_COSIGNER_SECRETS` and, if the threshold changed,
   `STELLAR_ANCHOR_REQUIRED_WEIGHT`, in every deployment that runs the
   anchoring scheduler.
6. Verify: trigger a batch anchor (`npm run dev -- anchor`, or wait for the
   scheduler's next tick) and confirm it succeeds against the new signer
   set.

## Validation Checklist
- No secret values are logged.
- The registry never deletes a historical record — only closes it with `validTo`.
- An export signed before rotation still verifies as authorized after rotation, using the updated registry.
- Anchor cosigner rotation is itself authorized by the current quorum, never by a single key.
- Rollback keys/records are retained until validation completes.
