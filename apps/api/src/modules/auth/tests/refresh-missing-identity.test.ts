import { describe, expect, it } from "vitest";
import { identityStore } from "../repositories/identity.repository.js";
import { sessionStore } from "../repositories/session.repository.js";

/**
 * Refresh must not mint a token (and must drop the session) when the identity is gone.
 * The controller check lives in AuthController.refresh; this pins the store behaviour it relies on.
 */
describe("refresh with a missing identity", () => {
  it("has no identity to fall back to", () => {
    identityStore._reset();
    expect(identityStore.findById("ghost")).toBeUndefined();
  });

  it("revokes the session by refresh token", () => {
    sessionStore._reset();
    sessionStore.save({
      sessionId: "s1",
      userId: "ghost",
      clinicId: "c1",
      accessToken: "a",
      refreshToken: "r",
      expiresAt: Math.floor(Date.now() / 1000) + 900,
      createdAt: new Date().toISOString(),
    });
    sessionStore.revokeByRefreshToken("r");
    expect(sessionStore.findByRefreshToken("r")).toBeUndefined();
  });
});
