import { serverConfig } from "@lumen/config";
import type { AnchoringHealthReport, AuditExportBundle, AuditExportVerifyReport } from "@lumen/types";

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

/**
 * Asks apps/stellar-service to independently re-verify a compliance export
 * bundle: recompute every entry's hash, walk its Merkle proof, and cross-
 * check against live Stellar state — the same logic the standalone CLI
 * verifier and the public web verification portal both rely on, so all
 * three agree on the same verdict for the same bundle.
 */
export async function verifyExportBundleRemote(bundle: AuditExportBundle): Promise<AuditExportVerifyReport> {
  const res = await fetch(`${serverConfig.stellarServiceUrl}/internal/verify-export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-service-token": serverConfig.internalServiceToken,
    },
    body: JSON.stringify({ bundle }),
  });

  if (res.status === 400) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new InvalidExportBundleError(body.message ?? "malformed export bundle");
  }
  if (!res.ok) {
    throw new Error(`[audit] failed to verify export bundle: ${res.status}`);
  }

  return (await res.json()) as AuditExportVerifyReport;
}

/** Distinguishes "the bundle itself is malformed" (400) from stellar-service being unreachable (502). */
export class InvalidExportBundleError extends Error {}

/**
 * Fetches the anchoring pipeline's operational health from apps/stellar-service
 * — whether the scheduled batch job is actually keeping up, not whether any
 * particular audit entry is anchored. Throws `AnchoringNotConfiguredError`
 * if the running stellar-service process doesn't run the scheduler.
 */
export async function fetchAnchoringHealth(): Promise<AnchoringHealthReport> {
  const res = await fetch(`${serverConfig.stellarServiceUrl}/internal/anchoring/health`, {
    headers: { "x-internal-service-token": serverConfig.internalServiceToken },
  });

  if (res.status === 501) {
    throw new AnchoringNotConfiguredError();
  }
  if (!res.ok) {
    throw new Error(`[audit] failed to fetch anchoring health: ${res.status}`);
  }

  return (await res.json()) as AnchoringHealthReport;
}

export class AnchoringNotConfiguredError extends Error {
  constructor() {
    super("the running stellar-service process doesn't run the anchoring scheduler");
  }
}
