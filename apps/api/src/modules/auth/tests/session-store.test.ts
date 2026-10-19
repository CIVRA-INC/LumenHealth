import { beforeEach, describe, expect, it } from "vitest";
import { identityStore, DuplicateEmailError } from "../repositories/identity.repository.js";
import { makeSession, sessionStore } from "../repositories/session.repository.js";

const base = { userId: "u1", clinicId: "c1" };

describe("identity email index", () => {
  beforeEach(() => identityStore._reset());
  const identity = (userId: string, email: string) => ({
    userId, clinicId: "c1", email, passwordHash: "h", role: "owner" as const, status: "active" as const, createdAt: "",
  });

  it("looks up by normalized email and rejects duplicates", () => {
    identityStore.save(identity("u1", "A@Example.com"));
    expect(identityStore.findByEmail("a@example.COM")?.userId).toBe("u1");
    expect(() => identityStore.save(identity("u2", "a@example.com"))).toThrow(DuplicateEmailError);
  });
});

describe("session store", () => {
  beforeEach(() => sessionStore._reset());

  it("stores only the refresh token hash and finds by raw token", () => {
    sessionStore.save(makeSession({ ...base, sessionId: "s1", accessToken: "a1", refreshToken: "raw-1" }));
    expect(sessionStore.findBySessionId("s1")?.refreshToken).not.toBe("raw-1");
    expect(sessionStore.findByRefreshToken("raw-1")?.sessionId).toBe("s1");
    expect(sessionStore.findByAccessToken("a1")?.sessionId).toBe("s1");
  });

  it("revokes the whole family when a rotated token is reused", () => {
    sessionStore.save(makeSession({ ...base, sessionId: "s1", accessToken: "a1", refreshToken: "r1" }));
    const familyId = sessionStore.findByRefreshToken("r1")?.familyId as string;
    sessionStore.revokeByRefreshToken("r1");
    sessionStore.save(makeSession({ ...base, sessionId: "s2", accessToken: "a2", refreshToken: "r2", familyId }));

    expect(sessionStore.wasRotated("r1")).toBe(familyId);
    sessionStore.revokeFamily(familyId);
    expect(sessionStore.findByRefreshToken("r2")).toBeUndefined();
  });

  it("drops expired sessions on access", () => {
    sessionStore.save({ ...makeSession({ ...base, sessionId: "s1", accessToken: "a1", refreshToken: "r1" }), expiresAt: 1 });
    expect(sessionStore.isValid("s1")).toBe(false);
    expect(sessionStore.findBySessionId("s1")).toBeUndefined();
  });
});
