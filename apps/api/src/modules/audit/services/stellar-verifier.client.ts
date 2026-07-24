import { serverConfig } from "@lumen/config";

/**
 * Fetches the Merkle root actually written on-chain for `txHash` from
 * apps/stellar-service's internal API. Returns `null` if that transaction
 * has no matching `manageData` entry (shouldn't happen for a tx hash we
 * ourselves stored, but treated as "can't verify" rather than a crash).
 */
export async function fetchAnchoredMerkleRoot(txHash: string): Promise<string | null> {
  const res = await fetch(
    `${serverConfig.stellarServiceUrl}/internal/tx/${encodeURIComponent(txHash)}/merkle-root`,
    {
      headers: { "x-internal-service-token": serverConfig.internalServiceToken },
    },
  );

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`[audit] failed to fetch anchored merkle root: ${res.status}`);
  }

  const body = (await res.json()) as { merkleRoot: string };
  return body.merkleRoot;
}

export type SignedPayload = {
  signature: string;
  publicKey: string;
};

/**
 * Asks apps/stellar-service to sign `payload` with its anchor keypair —
 * the same keypair that signs anchoring transactions, so an export's
 * signature can later be cross-checked against on-chain transaction
 * source accounts by a third party.
 */
export async function signExportManifest(payload: string): Promise<SignedPayload> {
  const res = await fetch(`${serverConfig.stellarServiceUrl}/internal/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-service-token": serverConfig.internalServiceToken,
    },
    body: JSON.stringify({ payload }),
  });

  if (!res.ok) {
    throw new Error(`[audit] failed to sign export manifest: ${res.status}`);
  }

  return (await res.json()) as SignedPayload;
}
