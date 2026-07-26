import { sha256Hash } from "@lumen/types";
import type { PatientIdentityAnchorStatus } from "@lumen/types";

export type IdentityAnchoredResult = {
  identityHash: string;
  stellarTxHash: string;
  anchoredAt: string;
};

export type IdentityVerificationResult = {
  isValid: boolean;
  identityHash: string;
  recomputedHash: string;
};

const identityStore = new Map<string, {
  identityHash: string;
  stellarTxHash: string;
  anchoredAt: string;
}>();

function canonicalizeIdentity(patientId: string, identityHash: string): string {
  return JSON.stringify({ patientId, identityHash, anchored: true });
}

export async function anchorPatientIdentity(
  patientId: string,
  identityHash: string,
): Promise<IdentityAnchoredResult> {
  const canonical = canonicalizeIdentity(patientId, identityHash);
  const proofHash = sha256Hash(canonical);
  const stellarTxHash = `tx_identity_${proofHash.slice(0, 12)}`;
  const anchoredAt = new Date().toISOString();

  identityStore.set(patientId, {
    identityHash,
    stellarTxHash,
    anchoredAt,
  });

  return { identityHash: proofHash, stellarTxHash, anchoredAt };
}

export async function verifyPatientIdentity(
  patientId: string,
  proof: string,
): Promise<IdentityVerificationResult> {
  const stored = identityStore.get(patientId);
  if (!stored) {
    return {
      isValid: false,
      identityHash: proof,
      recomputedHash: "",
    };
  }

  const canonical = canonicalizeIdentity(patientId, stored.identityHash);
  const recomputed = sha256Hash(canonical);

  return {
    isValid: recomputed === proof,
    identityHash: stored.identityHash,
    recomputedHash: recomputed,
  };
}

export async function getIdentityAnchorStatus(
  patientId: string,
): Promise<PatientIdentityAnchorStatus> {
  const stored = identityStore.get(patientId);
  if (!stored) {
    return { patientId, isAnchored: false };
  }

  return {
    patientId,
    isAnchored: true,
    identityHash: stored.identityHash,
    stellarTxHash: stored.stellarTxHash,
    anchoredAt: stored.anchoredAt,
  };
}

export function _resetIdentityStoreForTests(): void {
  identityStore.clear();
}
