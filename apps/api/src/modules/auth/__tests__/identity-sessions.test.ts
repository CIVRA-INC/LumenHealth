import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../token.service";

// Shared fixture – privacy-safe, deterministic
const fixture = {
  userId: "user_abc123",
  role: "doctor" as const,
  clinicId: "clinic_xyz",
};

describe("identity & sessions – token contracts", () => {
  describe("signAccessToken / verifyAccessToken", () => {
    it("round-trips a valid access token", () => {
      const token = signAccessToken(fixture);
      const decoded = verifyAccessToken(token);
      expect(decoded).toMatchObject({
        userId: fixture.userId,
        role: fixture.role,
        clinicId: fixture.clinicId,
      });
    });

    it("rejects a refresh token presented as access token", () => {
      const refresh = signRefreshToken(fixture);
      expect(verifyAccessToken(refresh)).toBeNull();
    });

    it("rejects a tampered access token", () => {
      const token = signAccessToken(fixture) + "tampered";
      expect(verifyAccessToken(token)).toBeNull();
    });
  });

  describe("signRefreshToken / verifyRefreshToken", () => {
    it("round-trips a valid refresh token", () => {
      const token = signRefreshToken(fixture);
      const decoded = verifyRefreshToken(token);
      expect(decoded).toMatchObject(fixture);
    });

    it("rejects an access token presented as refresh token", () => {
      const access = signAccessToken(fixture);
      expect(verifyRefreshToken(access)).toBeNull();
    });

    it("rejects a tampered refresh token", () => {
      const token = signRefreshToken(fixture) + "x";
      expect(verifyRefreshToken(token)).toBeNull();
    });
  });

  describe("authorization failure cases", () => {
    it("returns null for empty string", () => {
      expect(verifyAccessToken("")).toBeNull();
      expect(verifyRefreshToken("")).toBeNull();
    });

    it("returns null for completely invalid input", () => {
      expect(verifyAccessToken("not.a.jwt")).toBeNull();
    });
  });
});
