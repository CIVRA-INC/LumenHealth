import { afterEach, describe, expect, it, vi } from "vitest";
import { JwtAccessTokenSigner, deriveKid } from "../services/token.service.js";

function makeSigner(expiresIn = "15m") {
  const secret = "test-secret-that-is-long-enough-32ch";
  return new JwtAccessTokenSigner([{ kid: deriveKid(secret), secret }], expiresIn);
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

describe("JwtAccessTokenSigner (#1475)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sign then verify round-trip claims", () => {
    const signer = makeSigner();
    const token = signer.sign({ sub: "u1", clinicId: "c1", role: "owner" });
    const verified = signer.verify(token);
    expect(verified).toMatchObject({ sub: "u1", clinicId: "c1", role: "owner" });
    expect(verified?.jti).toBeTruthy();
  });

  it("tampered signature returns null", () => {
    const signer = makeSigner();
    const token = signer.sign({ sub: "u1", clinicId: "c1", role: "owner" });
    const tampered = token.slice(0, -2) + (token.slice(-2) === "aa" ? "bb" : "aa");
    expect(signer.verify(tampered)).toBeNull();
  });

  it("expired token returns null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const signer = makeSigner("1s");
    const token = signer.sign({ sub: "u1", clinicId: "c1", role: "owner" });
    vi.setSystemTime(new Date("2026-01-01T00:00:02Z"));
    expect(signer.verify(token)).toBeNull();
  });

  it("token signed with a different secret returns null", () => {
    const secretA = "secret-a-that-is-long-enough-32chars";
    const secretB = "secret-b-that-is-long-enough-32chars";
    const signerA = new JwtAccessTokenSigner([{ kid: deriveKid(secretA), secret: secretA }]);
    const signerB = new JwtAccessTokenSigner([{ kid: deriveKid(secretB), secret: secretB }]);
    const token = signerA.sign({ sub: "u1", clinicId: "c1", role: "owner" });
    expect(signerB.verify(token)).toBeNull();
  });

  it("alg none token is rejected", () => {
    const signer = makeSigner();
    const header = b64url(JSON.stringify({ alg: "none", typ: "JWT", kid: deriveKid("test-secret-that-is-long-enough-32ch") }));
    const payload = b64url(JSON.stringify({ sub: "u1", clinicId: "c1", role: "owner" }));
    const token = `${header}.${payload}.`;
    expect(signer.verify(token)).toBeNull();
  });
});
