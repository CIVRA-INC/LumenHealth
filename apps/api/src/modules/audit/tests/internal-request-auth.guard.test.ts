import { describe, it, expect } from "vitest";
import { HttpException, HttpStatus } from "@nestjs/common";
import { signInternalRequest } from "@lumen/types";
import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { InternalRequestAuthGuard } from "../guards/internal-request-auth.guard.js";
import type { ConfigService } from "../../../shared/config/config.service.js";

/**
 * #1345: the static `x-internal-service-token` header is replaced by a
 * short-lived HMAC signature. These tests exercise the Nest guard in
 * isolation — no app bootstrap required.
 */
const secrets = [{ keyId: "2026-10", secret: "test-secret" }];
const config = { internalServiceSecrets: secrets } as unknown as ConfigService;

function contextFor(req: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function guard() {
  return new InternalRequestAuthGuard(config);
}

function signedRequest(path: string, options: { secret?: string; keyId?: string; nowMs?: number } = {}) {
  const headers = signInternalRequest(
    { method: "GET", path },
    { keyId: options.keyId ?? "2026-10", secret: options.secret ?? "test-secret" },
    { nowMs: options.nowMs ?? Date.now() },
  );
  return { method: "GET", originalUrl: path, headers } as unknown as Partial<Request>;
}

describe("InternalRequestAuthGuard (#1345)", () => {
  it("allows a validly signed internal request", () => {
    const req = signedRequest("/internal/audit/unanchored");
    expect(guard().canActivate(contextFor(req))).toBe(true);
  });

  it("rejects a request with no auth headers", () => {
    const req = { method: "GET", originalUrl: "/internal/audit/unanchored", headers: {} } as Partial<Request>;
    expect(() => guard().canActivate(contextFor(req))).toThrow(HttpException);
    try {
      guard().canActivate(contextFor(req));
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    }
  });

  it("rejects the legacy static service token", () => {
    const req = {
      method: "GET",
      originalUrl: "/internal/audit/unanchored",
      headers: { "x-internal-service-token": "dev-internal-token" },
    } as unknown as Partial<Request>;
    expect(() => guard().canActivate(contextFor(req))).toThrow(HttpException);
  });

  it("rejects a signature made with the wrong secret", () => {
    const req = signedRequest("/internal/audit/unanchored", { secret: "not-the-secret" });
    expect(() => guard().canActivate(contextFor(req))).toThrow(HttpException);
  });

  it("rejects an unknown key id", () => {
    const req = signedRequest("/internal/audit/unanchored", { keyId: "unknown", secret: "test-secret" });
    expect(() => guard().canActivate(contextFor(req))).toThrow(HttpException);
  });

  it("rejects a stale signature", () => {
    const req = signedRequest("/internal/audit/unanchored", { nowMs: Date.now() - 10 * 60 * 1000 });
    expect(() => guard().canActivate(contextFor(req))).toThrow(HttpException);
  });

  it("accepts a signature from a second active secret (rotation)", () => {
    const rotated = { keyId: "2026-11", secret: "next-secret" };
    secrets.push(rotated);
    try {
      const req = signedRequest("/internal/audit/unanchored", { keyId: rotated.keyId, secret: rotated.secret });
      expect(guard().canActivate(contextFor(req))).toBe(true);
    } finally {
      secrets.pop();
    }
  });
});
