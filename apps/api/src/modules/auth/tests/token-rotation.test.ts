import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
  JwtAccessTokenSigner,
  accessTokenSigner,
  assertStrongSecret,
  deriveKid,
} from "../services/token.service.js";

/**
 * JWT hardening (#1337): alg pinning, iss/aud/jti (+ optional sid), kid key
 * ring with two active keys for zero-downtime rotation, and refusal to start
 * on weak or default secrets.
 */

const OLD_SECRET = "rotating-out-secret-at-least-32-characters-long";
const NEW_SECRET = "rotating-in-secret-at-least-32-characters-xxxx";

const payload = { sub: "u1", clinicId: "c1", role: "owner" };

describe("token signer hardening", () => {
  it("signs with iss/aud/jti and the active kid; verify round-trips", () => {
    const signer = new JwtAccessTokenSigner([
      { kid: deriveKid(NEW_SECRET), secret: NEW_SECRET },
    ]);
    const token = signer.sign(payload);

    const decoded = jwt.decode(token, { complete: true });
    expect(decoded?.header.kid).toBe(deriveKid(NEW_SECRET));
    expect(decoded?.header.alg).toBe("HS256");

    const verified = signer.verify(token);
    expect(verified).toMatchObject(payload);
    expect(verified?.iss).toBe(ACCESS_TOKEN_ISSUER);
    expect(verified?.aud).toBe(ACCESS_TOKEN_AUDIENCE);
    expect(verified?.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("carries the sid session claim when the caller provides one", () => {
    const signer = new JwtAccessTokenSigner([{ kid: deriveKid(NEW_SECRET), secret: NEW_SECRET }]);
    const token = signer.sign({ ...payload, sid: "session-123" });
    expect(signer.verify(token)).toMatchObject({ sid: "session-123" });
  });

  it("zero-downtime rotation: old-key tokens verify through the ring while new tokens sign with the new key", () => {
    const retiring = new JwtAccessTokenSigner([{ kid: deriveKid(OLD_SECRET), secret: OLD_SECRET }]);
    const legacyToken = retiring.sign(payload); // issued before the rotation

    const ring = new JwtAccessTokenSigner([
      { kid: deriveKid(NEW_SECRET), secret: NEW_SECRET }, // active: signs
      { kid: deriveKid(OLD_SECRET), secret: OLD_SECRET }, // retiring: verifies only
    ]);

    const fresh = ring.sign(payload);
    expect(jwt.decode(fresh, { complete: true })?.header.kid).toBe(deriveKid(NEW_SECRET));
    expect(ring.verify(fresh)).toMatchObject(payload);
    // Old tokens keep verifying through the dual-key window.
    expect(jwt.decode(legacyToken, { complete: true })?.header.kid).toBe(deriveKid(OLD_SECRET));
    expect(ring.verify(legacyToken)).toMatchObject(payload);
  });

  it("rejects a token from a key outside the ring (unknown kid)", () => {
    const stranger = new JwtAccessTokenSigner([
      { kid: deriveKid("some-other-secret-at-least-32-characters!!"), secret: "some-other-secret-at-least-32-characters!!" },
    ]);
    const ring = new JwtAccessTokenSigner([{ kid: deriveKid(NEW_SECRET), secret: NEW_SECRET }]);
    expect(ring.verify(stranger.sign(payload))).toBeNull();
  });

  it("rejects tokens signed with algorithm none", () => {
    const signer = new JwtAccessTokenSigner([{ kid: deriveKid(NEW_SECRET), secret: NEW_SECRET }]);
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT", kid: deriveKid(NEW_SECRET) })).toString("base64url");
    const body = Buffer.from(
      JSON.stringify({ ...payload, iss: ACCESS_TOKEN_ISSUER, aud: ACCESS_TOKEN_AUDIENCE, exp: 9999999999 })
    ).toString("base64url");
    const forged = `${header}.${body}.`;
    expect(signer.verify(forged)).toBeNull();
  });

  it("rejects a wrong algorithm (HS512) despite the correct secret and kid", () => {
    const signer = new JwtAccessTokenSigner([{ kid: deriveKid(NEW_SECRET), secret: NEW_SECRET }]);
    const token = jwt.sign(payload, NEW_SECRET, {
      algorithm: "HS512",
      keyid: deriveKid(NEW_SECRET),
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });
    expect(signer.verify(token)).toBeNull();
  });

  it("rejects tokens missing the issuer/audience claims", () => {
    const signer = new JwtAccessTokenSigner([{ kid: deriveKid(NEW_SECRET), secret: NEW_SECRET }]);
    const token = jwt.sign(payload, NEW_SECRET, {
      algorithm: "HS256",
      keyid: deriveKid(NEW_SECRET),
    });
    expect(signer.verify(token)).toBeNull();
  });

  it("rejects tampered tokens and garbage", () => {
    const signer = new JwtAccessTokenSigner([{ kid: deriveKid(NEW_SECRET), secret: NEW_SECRET }]);
    const token = signer.sign(payload);
    const [h, p, s] = token.split(".");
    const tampered = `${h}.${Buffer.from(JSON.stringify({ ...payload, role: "owner_admin" })).toString("base64url")}.${s}`;
    expect(signer.verify(tampered)).toBeNull();
    expect(signer.verify("not-a-token")).toBeNull();
    expect(signer.verify(`${h}.${p}.`)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const signer = new JwtAccessTokenSigner([{ kid: deriveKid(NEW_SECRET), secret: NEW_SECRET }], "-10s");
    expect(signer.verify(signer.sign(payload))).toBeNull();
  });

  it("the shared singleton (env-configured) behaves identically", () => {
    const token = accessTokenSigner.sign(payload);
    expect(jwt.decode(token, { complete: true })?.header.kid).toBe(
      deriveKid(process.env.AUTH_ACCESS_TOKEN_KEY ?? "")
    );
    expect(accessTokenSigner.verify(token)).toMatchObject(payload);
  });
});

describe("startup secret validation", () => {
  it("assertStrongSecret rejects missing, known-default and short secrets", () => {
    expect(() => assertStrongSecret(undefined, "K")).toThrow(/is required/);
    expect(() => assertStrongSecret("dev-local-secret-change-in-production", "K")).toThrow(/known default/);
    expect(() => assertStrongSecret("short", "K")).toThrow(/at least 32 characters/);
    expect(assertStrongSecret("x".repeat(32), "K")).toBe("x".repeat(32));
  });

  it("module load refuses to start without AUTH_ACCESS_TOKEN_KEY", async () => {
    vi.resetModules();
    const previous = process.env.AUTH_ACCESS_TOKEN_KEY;
    delete process.env.AUTH_ACCESS_TOKEN_KEY;
    try {
      await expect(import("../services/token.service.js")).rejects.toThrow(/AUTH_ACCESS_TOKEN_KEY is required/);
    } finally {
      process.env.AUTH_ACCESS_TOKEN_KEY = previous;
    }
  });

  it("module load refuses to start on the historical default secret", async () => {
    vi.resetModules();
    vi.stubEnv("AUTH_ACCESS_TOKEN_KEY", "dev-local-secret-change-in-production");
    try {
      await expect(import("../services/token.service.js")).rejects.toThrow(/known default secret/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("module load refuses to start on a weak PREVIOUS rotation secret", async () => {
    vi.resetModules();
    vi.stubEnv("AUTH_ACCESS_TOKEN_KEY", "a".repeat(40));
    vi.stubEnv("AUTH_ACCESS_TOKEN_KEY_PREVIOUS", "short-previous");
    try {
      await expect(import("../services/token.service.js")).rejects.toThrow(/AUTH_ACCESS_TOKEN_KEY_PREVIOUS/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
