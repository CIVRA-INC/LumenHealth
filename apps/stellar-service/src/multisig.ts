import { Keypair, Operation } from "@stellar/stellar-sdk";
import type { Transaction } from "@stellar/stellar-sdk";

/**
 * One party authorized to co-sign anchor transactions for the shared
 * multisig anchor account. `sign` is async and takes the whole transaction
 * (rather than exposing raw key material) so a cosigner can be backed by a
 * local `Keypair` today and a call to a genuinely separate remote signing
 * service later, without changing anything in `AnchoringService`.
 */
export type Cosigner = {
  publicKey: string;
  /** Matches the signer weight configured for this key on the shared anchor account. */
  weight: number;
  sign: (transaction: Transaction) => Promise<void>;
};

/** Wraps a locally-held `Keypair` as a `Cosigner` — the common case for a hackathon/dev deployment. */
export function localCosigner(keypair: Keypair, weight: number): Cosigner {
  return {
    publicKey: keypair.publicKey(),
    weight,
    sign: async (transaction) => {
      transaction.sign(keypair);
    },
  };
}

export class InsufficientSignaturesError extends Error {
  constructor(
    public readonly collectedWeight: number,
    public readonly requiredWeight: number,
  ) {
    super(
      `insufficient signatures to submit anchor transaction: collected weight ${collectedWeight}, need ${requiredWeight}`,
    );
    this.name = "InsufficientSignaturesError";
  }
}

/**
 * Has every cosigner sign `transaction` and fails fast — without touching
 * Horizon — if their combined weight doesn't meet `requiredWeight`. Stellar
 * itself would reject an under-signed transaction too, but checking here
 * avoids burning a submission (and a retry cycle) on something we already
 * know is short of signatures.
 */
export async function collectSignatures(
  transaction: Transaction,
  cosigners: Cosigner[],
  requiredWeight: number,
): Promise<void> {
  let collectedWeight = 0;
  for (const cosigner of cosigners) {
    await cosigner.sign(transaction);
    collectedWeight += cosigner.weight;
  }

  if (collectedWeight < requiredWeight) {
    throw new InsufficientSignaturesError(collectedWeight, requiredWeight);
  }
}

/**
 * Builds the `setOptions` operations that configure an account as an N-of-M
 * multisig anchor account: register each cosigner as a signer at its
 * configured weight, set every threshold to `requiredWeight` (anchoring
 * only ever performs `manageData`, a "medium" threshold operation in
 * Stellar's classification, so low/medium/high are set uniformly here for
 * simplicity), and drop the master key's weight to 0 so the account can no
 * longer be unilaterally controlled by whichever key created it.
 *
 * Run once, out-of-band, against the anchor account before it's used for
 * anchoring — not called from the anchoring hot path.
 */
export function buildMultisigSetupOperations(
  cosigners: Pick<Cosigner, "publicKey" | "weight">[],
  requiredWeight: number,
): ReturnType<typeof Operation.setOptions>[] {
  const ops = cosigners.map((cosigner) =>
    Operation.setOptions({
      signer: { ed25519PublicKey: cosigner.publicKey, weight: cosigner.weight },
    }),
  );

  ops.push(
    Operation.setOptions({
      masterWeight: 0,
      lowThreshold: requiredWeight,
      medThreshold: requiredWeight,
      highThreshold: requiredWeight,
    }),
  );

  return ops;
}
