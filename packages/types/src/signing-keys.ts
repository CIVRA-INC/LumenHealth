/**
 * The two structurally different signing responsibilities that used to
 * share a single Stellar keypair: authorizing on-chain anchor transactions,
 * and attesting compliance-export manifests. Kept separate so a leaked key
 * for one role can't be used to forge the other.
 */
export type SigningKeyRole = "anchor-cosigner" | "export-signing";

/**
 * One entry in a documented key-rotation log: a public key that was (or
 * still is) authorized for a given role during `[validFrom, validTo)`. An
 * absent `validTo` means the key is still active. Rotating a key means
 * closing out its old record with a `validTo` and adding a new one —
 * existing records are never deleted, so anything signed while a key was
 * still valid stays independently verifiable after rotation.
 */
export type SigningKeyRecord = {
  publicKey: string;
  role: SigningKeyRole;
  validFrom: string;
  validTo?: string;
};

/**
 * Whether `publicKey` was an authorized signer for `role` at instant `atIso`
 * according to `registry`. Used defensively during verification: a
 * cryptographically valid signature from a key that was never authorized
 * for this role (or was authorized only outside this time window) should
 * not be trusted just because the signature itself checks out.
 */
export function isAuthorizedSigningKey(
  registry: SigningKeyRecord[],
  role: SigningKeyRole,
  publicKey: string,
  atIso: string,
): boolean {
  return registry.some(
    (record) =>
      record.role === role &&
      record.publicKey === publicKey &&
      record.validFrom <= atIso &&
      (record.validTo === undefined || atIso < record.validTo),
  );
}
