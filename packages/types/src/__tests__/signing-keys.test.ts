import { describe, expect, it } from "vitest";
import { isAuthorizedSigningKey, type SigningKeyRecord } from "../signing-keys.js";

const registry: SigningKeyRecord[] = [
  { publicKey: "GOLD", role: "anchor-cosigner", validFrom: "2026-01-01T00:00:00.000Z", validTo: "2026-06-01T00:00:00.000Z" },
  { publicKey: "GNEW", role: "anchor-cosigner", validFrom: "2026-06-01T00:00:00.000Z" },
  { publicKey: "GEXPORT", role: "export-signing", validFrom: "2026-01-01T00:00:00.000Z" },
];

describe("isAuthorizedSigningKey", () => {
  it("authorizes a key within its active validity window", () => {
    expect(isAuthorizedSigningKey(registry, "anchor-cosigner", "GOLD", "2026-03-01T00:00:00.000Z")).toBe(true);
  });

  it("rejects a key checked before its validFrom", () => {
    expect(isAuthorizedSigningKey(registry, "anchor-cosigner", "GNEW", "2026-03-01T00:00:00.000Z")).toBe(false);
  });

  it("rejects a rotated-out key checked after its validTo", () => {
    expect(isAuthorizedSigningKey(registry, "anchor-cosigner", "GOLD", "2026-07-01T00:00:00.000Z")).toBe(false);
  });

  it("still authorizes a rotated-out key for a timestamp while it was valid, even after rotation happened", () => {
    // This is the whole point of the registry: a compliance export signed in
    // March by the old key stays verifiable after the June rotation.
    expect(isAuthorizedSigningKey(registry, "anchor-cosigner", "GOLD", "2026-03-01T00:00:00.000Z")).toBe(true);
  });

  it("authorizes the new key once it becomes active", () => {
    expect(isAuthorizedSigningKey(registry, "anchor-cosigner", "GNEW", "2026-07-01T00:00:00.000Z")).toBe(true);
  });

  it("treats a missing validTo as still active indefinitely", () => {
    expect(isAuthorizedSigningKey(registry, "export-signing", "GEXPORT", "2099-01-01T00:00:00.000Z")).toBe(true);
  });

  it("rejects a key that's authorized for a different role", () => {
    expect(isAuthorizedSigningKey(registry, "export-signing", "GOLD", "2026-03-01T00:00:00.000Z")).toBe(false);
  });

  it("rejects a public key that was never in the registry", () => {
    expect(isAuthorizedSigningKey(registry, "anchor-cosigner", "GUNKNOWN", "2026-03-01T00:00:00.000Z")).toBe(false);
  });
});
