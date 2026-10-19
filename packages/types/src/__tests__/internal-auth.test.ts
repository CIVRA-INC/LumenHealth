import { describe, expect, it } from "vitest";
import {
  INTERNAL_AUTH_KEY_ID_HEADER,
  INTERNAL_AUTH_NONCE_HEADER,
  INTERNAL_AUTH_SIGNATURE_HEADER,
  INTERNAL_AUTH_TIMESTAMP_HEADER,
  NonceReplayCache,
  hashRequestBody,
  internalAuthSigningString,
  signInternalRequest,
  verifyInternalRequest,
  type InternalAuthSecret,
} from "../internal-auth.js";

const active: InternalAuthSecret = { keyId: "2026-10", secret: "current-secret" };
const previous: InternalAuthSecret = { keyId: "2026-09", secret: "previous-secret" };
const secrets = [active, previous];

const NOW = 1_800_000_000_000; // fixed clock for deterministic timestamps

describe("internalAuthSigningString", () => {
  it("binds method, path, body hash, timestamp and nonce", () => {
    const s = internalAuthSigningString({
      method: "post",
      path: "/internal/sign",
      bodyHash: "abc",
      timestamp: "123",
      nonce: "n1",
    });
    expect(s).toBe("v1\nPOST\n/internal/sign\nabc\n123\nn1");
  });
});

describe("hashRequestBody", () => {
  it("is order-independent and treats an absent body as null", () => {
    expect(hashRequestBody({ a: 1, b: 2 })).toBe(hashRequestBody({ b: 2, a: 1 }));
    expect(hashRequestBody(undefined)).toBe(hashRequestBody(null));
    expect(hashRequestBody({ a: 1 })).not.toBe(hashRequestBody({ a: 2 }));
  });
});

describe("verifyInternalRequest", () => {
  function signed(options: { nowMs?: number; nonce?: string; secret?: InternalAuthSecret; body?: unknown; path?: string } = {}) {
    const headers = signInternalRequest(
      { method: "POST", path: options.path ?? "/internal/sign", body: options.body ?? { payload: "x" } },
      options.secret ?? active,
      { nowMs: options.nowMs ?? NOW, nonce: options.nonce },
    );
    return headers;
  }

  it("accepts a freshly signed request", () => {
    const result = verifyInternalRequest(
      { method: "POST", path: "/internal/sign", body: { payload: "x" }, headers: signed() },
      secrets,
      { nowMs: NOW },
    );
    expect(result).toEqual({ ok: true, keyId: "2026-10" });
  });

  it("accepts a signature from the rotated-out (previous) secret — rotation needs no coordinated restart", () => {
    const result = verifyInternalRequest(
      { method: "POST", path: "/internal/sign", body: { payload: "x" }, headers: signed({ secret: previous }) },
      secrets,
      { nowMs: NOW },
    );
    expect(result).toEqual({ ok: true, keyId: "2026-09" });
  });

  it("rejects a stale timestamp beyond the tolerance window", () => {
    const headers = signed({ nowMs: NOW - 10 * 60 * 1000 }); // 10 minutes old
    const result = verifyInternalRequest(
      { method: "POST", path: "/internal/sign", body: { payload: "x" }, headers },
      secrets,
      { nowMs: NOW },
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/stale or future-dated/i);
  });

  it("rejects a replayed nonce via the replay cache", () => {
    const headers = signed({ nonce: "nonce-1" });
    const cache = new NonceReplayCache();
    const first = verifyInternalRequest(
      { method: "POST", path: "/internal/sign", body: { payload: "x" }, headers },
      secrets,
      { nowMs: NOW, replayCache: cache },
    );
    const second = verifyInternalRequest(
      { method: "POST", path: "/internal/sign", body: { payload: "x" }, headers },
      secrets,
      { nowMs: NOW, replayCache: cache },
    );
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false });
    if (!second.ok) expect(second.reason).toMatch(/replayed nonce/i);
  });

  it("rejects a tampered body (signature covers the body hash)", () => {
    const result = verifyInternalRequest(
      { method: "POST", path: "/internal/sign", body: { payload: "tampered" }, headers: signed() },
      secrets,
      { nowMs: NOW },
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/invalid request signature/i);
  });

  it("rejects a path that differs from the signed one", () => {
    const result = verifyInternalRequest(
      { method: "POST", path: "/internal/verify-export", body: { payload: "x" }, headers: signed() },
      secrets,
      { nowMs: NOW },
    );
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects an unknown key id", () => {
    const headers = signed({ secret: { keyId: "unknown-key", secret: "whatever" } });
    const result = verifyInternalRequest(
      { method: "POST", path: "/internal/sign", body: { payload: "x" }, headers },
      secrets,
      { nowMs: NOW },
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/unknown internal auth key id/i);
  });

  it("rejects requests with missing auth headers", () => {
    const result = verifyInternalRequest(
      { method: "POST", path: "/internal/sign", body: {}, headers: {} },
      secrets,
      { nowMs: NOW },
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/missing internal auth headers/i);
  });

  it("emits all four required auth headers", () => {
    const headers = signed();
    expect(Object.keys(headers).sort()).toEqual(
      [
        INTERNAL_AUTH_KEY_ID_HEADER,
        INTERNAL_AUTH_NONCE_HEADER,
        INTERNAL_AUTH_SIGNATURE_HEADER,
        INTERNAL_AUTH_TIMESTAMP_HEADER,
      ].sort(),
    );
  });
});

describe("NonceReplayCache", () => {
  it("prunes expired entries on access", () => {
    const cache = new NonceReplayCache(300);
    cache.checkAndRecord("n1", 1000, 1_000_000);
    expect(cache.size).toBe(1);
    // 1000 + 300 < 2000 → pruned
    cache.checkAndRecord("n2", 2_000, 2_000_000);
    expect(cache.size).toBe(1);
  });
});
