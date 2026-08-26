import { Keypair, Networks } from "@stellar/stellar-sdk";
import { serverConfig } from "@lumen/config";
import type { SigningKeyRecord } from "@lumen/types";
import { localCosigner, type Cosigner } from "./multisig.js";

export type StellarNetworkConfig = {
  network: string;
  networkPassphrase: string;
  horizonUrl: string;
};

export function loadNetworkConfig(): StellarNetworkConfig {
  return {
    network: serverConfig.stellarNetwork,
    networkPassphrase:
      serverConfig.stellarNetwork === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    horizonUrl: serverConfig.stellarHorizonUrl,
  };
}

/**
 * Loads the shared multisig anchor account's public key from
 * `STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY` — the account anchor transactions are
 * submitted *from*, distinct from any individual cosigner's own account.
 */
export function loadAnchorAccountPublicKey(): string {
  const value = process.env.STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY?.trim();
  if (!value) {
    throw new Error(
      "[stellar-service] Missing required environment variable: STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY",
    );
  }
  return value;
}

/**
 * Loads every anchor cosigner keypair this process holds, from
 * `STELLAR_ANCHOR_COSIGNER_SECRETS` (comma-separated Stellar secret seeds).
 * A production deployment might hold only a subset of the account's
 * configured signers locally and call out to separate services for the
 * rest; this loader covers the common dev/hackathon case where every
 * cosigner key is available in-process.
 */
export function loadAnchorCosignerKeypairs(): Keypair[] {
  const raw = process.env.STELLAR_ANCHOR_COSIGNER_SECRETS?.trim();
  if (!raw) {
    throw new Error(
      "[stellar-service] Missing required environment variable: STELLAR_ANCHOR_COSIGNER_SECRETS",
    );
  }
  return raw
    .split(",")
    .map((secret) => secret.trim())
    .filter((secret) => secret.length > 0)
    .map((secret) => Keypair.fromSecret(secret));
}

/**
 * Combined cosigner weight required to submit an anchor transaction — must
 * match the threshold actually configured on the shared account (see
 * `buildMultisigSetupOperations`). Defaults to requiring every locally-held
 * cosigner to sign, i.e. `STELLAR_ANCHOR_REQUIRED_WEIGHT` unset means no
 * quorum shortcut.
 */
export function loadAnchorRequiredWeight(cosignerCount: number): number {
  const raw = process.env.STELLAR_ANCHOR_REQUIRED_WEIGHT?.trim();
  return raw ? Number(raw) : cosignerCount;
}

/**
 * Loads the export-manifest signing keypair from `STELLAR_EXPORT_SIGNING_SECRET`
 * — deliberately a different key from any anchor cosigner, so a leaked
 * export-signing key can't be used to forge an on-chain anchor transaction,
 * and a leaked anchor cosigner key can't be used to forge a compliance
 * export attestation.
 */
export function loadExportSigningKeypair(): Keypair {
  const secret = process.env.STELLAR_EXPORT_SIGNING_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "[stellar-service] Missing required environment variable: STELLAR_EXPORT_SIGNING_SECRET",
    );
  }
  return Keypair.fromSecret(secret);
}

export type AnchorMultisigSetup = {
  anchorAccountPublicKey: string;
  cosigners: Cosigner[];
  requiredWeight: number;
};

/** Assembles everything `AnchoringService` needs to submit multisig anchor transactions, from env config. */
export function loadAnchorMultisigSetup(): AnchorMultisigSetup {
  const anchorAccountPublicKey = loadAnchorAccountPublicKey();
  const cosigners = loadAnchorCosignerKeypairs().map((keypair) => localCosigner(keypair, 1));
  const requiredWeight = loadAnchorRequiredWeight(cosigners.length);
  return { anchorAccountPublicKey, cosigners, requiredWeight };
}

/**
 * Loads the documented export-signing key rotation log used to verify a
 * bundle's `signingPublicKey` was actually authorized when it signed,
 * not just cryptographically well-formed. Configured via
 * `STELLAR_SIGNING_KEY_REGISTRY_JSON` (a JSON `SigningKeyRecord[]`) — see
 * `docs/key-rotation.md` for the rotation procedure.
 *
 * If unset, falls back to a single record treating the currently
 * configured export-signing key as always having been authorized, so
 * verification keeps working out of the box before any rotation has ever
 * happened. Once a real rotation log exists, set the env var and this
 * fallback stops being used.
 */
export function loadSigningKeyRegistry(): SigningKeyRecord[] {
  const raw = process.env.STELLAR_SIGNING_KEY_REGISTRY_JSON?.trim();
  if (raw) {
    return JSON.parse(raw) as SigningKeyRecord[];
  }

  const exportKeypair = loadExportSigningKeypair();
  return [
    {
      publicKey: exportKeypair.publicKey(),
      role: "export-signing",
      validFrom: "1970-01-01T00:00:00.000Z",
    },
  ];
}
