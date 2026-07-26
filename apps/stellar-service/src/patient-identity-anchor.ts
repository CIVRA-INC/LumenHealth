import { Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import type { Keypair } from "@stellar/stellar-sdk";
import type { StellarClient } from "./client.js";
import { sha256Hash } from "./hashing.js";

export interface AnchorIdentityResult {
  patientId: string;
  identityHash: string;
  stellarTxHash: string;
  anchoredAt: string;
}

export interface VerifyIdentityResult {
  patientId: string;
  verified: boolean;
  onChainHash: string | null;
}

const IDENTITY_DATA_PREFIX = "patient_identity";

export function buildIdentityDataName(patientId: string): string {
  return `${IDENTITY_DATA_PREFIX}_${patientId}`;
}

export async function anchorIdentity(
  client: StellarClient,
  keypair: Keypair,
  patientId: string,
  identityHash: string,
): Promise<AnchorIdentityResult> {
  const account = await client.loadAccount(keypair.publicKey());

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: client.network.networkPassphrase,
  })
    .addOperation(
      Operation.manageData({
        name: buildIdentityDataName(patientId),
        value: identityHash,
      }),
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);

  const response = await client.raw().submitTransaction(transaction);

  return {
    patientId,
    identityHash,
    stellarTxHash: response.hash,
    anchoredAt: new Date().toISOString(),
  };
}

export async function verifyIdentity(
  client: StellarClient,
  patientId: string,
  proof: { stellarTxHash: string },
): Promise<VerifyIdentityResult> {
  const dataName = buildIdentityDataName(patientId);
  const onChainHash = await client.getManageDataValue(proof.stellarTxHash, dataName);

  return {
    patientId,
    verified: onChainHash !== null,
    onChainHash,
  };
}

export function computeIdentityHash(data: Record<string, unknown>): string {
  return sha256Hash(data);
}
