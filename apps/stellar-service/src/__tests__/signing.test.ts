import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { signPayload, verifyPayloadSignature } from "../signing.js";

describe("signPayload / verifyPayloadSignature", () => {
  it("produces a signature that verifies against the signer's public key", () => {
    const keypair = Keypair.random();
    const signed = signPayload(keypair, '{"a":1}');

    expect(signed.publicKey).toBe(keypair.publicKey());
    expect(verifyPayloadSignature(signed.publicKey, '{"a":1}', signed.signature)).toBe(true);
  });

  it("fails verification if the payload was altered after signing", () => {
    const keypair = Keypair.random();
    const signed = signPayload(keypair, '{"a":1}');

    expect(verifyPayloadSignature(signed.publicKey, '{"a":2}', signed.signature)).toBe(false);
  });

  it("fails verification against the wrong public key", () => {
    const keypair = Keypair.random();
    const otherKeypair = Keypair.random();
    const signed = signPayload(keypair, '{"a":1}');

    expect(verifyPayloadSignature(otherKeypair.publicKey(), '{"a":1}', signed.signature)).toBe(false);
  });

  it("returns false rather than throwing for a malformed public key", () => {
    expect(verifyPayloadSignature("not-a-real-key", "payload", "sig")).toBe(false);
  });

  it("returns false rather than throwing for a malformed signature", () => {
    const keypair = Keypair.random();
    expect(verifyPayloadSignature(keypair.publicKey(), "payload", "not-base64-sig!!")).toBe(false);
  });
});
