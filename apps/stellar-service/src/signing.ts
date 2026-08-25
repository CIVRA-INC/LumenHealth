import { Keypair } from "@stellar/stellar-sdk";

export type SignedPayload = {
  signature: string;
  publicKey: string;
};

/** Signs `payload` (expected to be a canonicalized JSON string) with `keypair`'s ed25519 key. */
export function signPayload(keypair: Keypair, payload: string): SignedPayload {
  const signature = keypair.sign(Buffer.from(payload, "utf8")).toString("base64");
  return { signature, publicKey: keypair.publicKey() };
}

/**
 * Verifies a base64 ed25519 signature over `payload` against `publicKey`.
 * Returns `false` (never throws) for a malformed key or signature.
 */
export function verifyPayloadSignature(publicKey: string, payload: string, signature: string): boolean {
  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    return keypair.verify(Buffer.from(payload, "utf8"), Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}
