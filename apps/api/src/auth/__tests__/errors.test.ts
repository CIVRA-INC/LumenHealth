import { describe, expect, it } from "vitest";
import { authErrorStatus, normalizeAuthError } from "../errors.js";

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

  it("normalizes unknown errors into a safe auth error payload", () => {
    expect(normalizeAuthError(new Error("boom"))).toEqual({
      error: "AUTH_TOKEN_INVALID",
      message: "boom",
    });
  });
});
