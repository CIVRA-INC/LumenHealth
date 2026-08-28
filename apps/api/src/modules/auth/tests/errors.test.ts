import { describe, expect, it } from "vitest";
import { authErrorStatus, normalizeAuthError } from "../../../shared/errors/index.js";

describe("auth error normalization", () => {
  it("maps auth error codes to the expected HTTP status", () => {
    expect(authErrorStatus("AUTH_MISSING_CREDENTIALS")).toBe(400);
    expect(authErrorStatus("AUTH_INVALID_CREDENTIALS")).toBe(401);
    expect(authErrorStatus("AUTH_FORBIDDEN")).toBe(403);
    expect(authErrorStatus("AUTH_ACCOUNT_LOCKED")).toBe(423);
  });

  it("passes through already normalized auth errors", () => {
    const error = { error: "AUTH_EMAIL_TAKEN", message: "already exists" } as const;
    expect(normalizeAuthError(error)).toEqual(error);
  });

  it("returns null for unknown (non-auth) errors instead of leaking err.message", () => {
    // The handler turns null into a generic 500 — see errorHandler in
    // auth.controller.ts. Crucially, the raw "boom" message is never surfaced
    // and the error is not mislabeled AUTH_TOKEN_INVALID (issue #1014).
    expect(normalizeAuthError(new Error("boom"))).toBeNull();
  });
});
