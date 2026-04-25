import { describe, it, expect } from "vitest";
import {
  registerFanSchema,
  registerArtistSchema,
  registerChordUserSchema,
  moderateUserSchema,
  updateConsentSchema,
  createAdminSchema,
} from "../src/modules/users/chord-user.validation";
import {
  ChordPersonaValues,
  ConsentStateValues,
  ModerationStatusValues,
} from "../src/modules/users/chord-user.model";

describe("CHORD-032 – ChordUser schema validation", () => {
  // -------------------------------------------------------------------------
  // Persona constants
  // -------------------------------------------------------------------------

  it("exports the three expected personas", () => {
    expect(ChordPersonaValues).toEqual(["FAN", "ARTIST", "ADMIN"]);
  });

  it("exports the expected consent states", () => {
    expect(ConsentStateValues).toEqual(["PENDING", "ACCEPTED", "WITHDRAWN"]);
  });

  it("exports the expected moderation statuses", () => {
    expect(ModerationStatusValues).toEqual(["ACTIVE", "WARNED", "SUSPENDED", "BANNED"]);
  });

  // -------------------------------------------------------------------------
  // Fan registration
  // -------------------------------------------------------------------------

  it("accepts a valid fan registration payload", () => {
    const result = registerFanSchema.safeParse({
      persona: "FAN",
      email: "fan@example.com",
      password: "securepass1",
      displayName: "MusicLover42",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a fan registration with a short password", () => {
    const result = registerFanSchema.safeParse({
      persona: "FAN",
      email: "fan@example.com",
      password: "short",
      displayName: "MusicLover42",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fan registration with an invalid email", () => {
    const result = registerFanSchema.safeParse({
      persona: "FAN",
      email: "not-an-email",
      password: "securepass1",
      displayName: "MusicLover42",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fan registration with an empty displayName", () => {
    const result = registerFanSchema.safeParse({
      persona: "FAN",
      email: "fan@example.com",
      password: "securepass1",
      displayName: "",
    });
    expect(result.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Artist registration
  // -------------------------------------------------------------------------

  it("accepts a valid artist registration payload without a Stellar key", () => {
    const result = registerArtistSchema.safeParse({
      persona: "ARTIST",
      email: "artist@example.com",
      password: "securepass1",
      stageName: "DJ Kiro",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid artist registration payload with a Stellar key", () => {
    const result = registerArtistSchema.safeParse({
      persona: "ARTIST",
      email: "artist@example.com",
      password: "securepass1",
      stageName: "DJ Kiro",
      stellarPublicKey: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an artist registration with an invalid Stellar key", () => {
    const result = registerArtistSchema.safeParse({
      persona: "ARTIST",
      email: "artist@example.com",
      password: "securepass1",
      stageName: "DJ Kiro",
      stellarPublicKey: "not-a-stellar-key",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an artist registration with an empty stageName", () => {
    const result = registerArtistSchema.safeParse({
      persona: "ARTIST",
      email: "artist@example.com",
      password: "securepass1",
      stageName: "",
    });
    expect(result.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Admin creation
  // -------------------------------------------------------------------------

  it("accepts a valid admin creation payload with default permissions", () => {
    const result = createAdminSchema.safeParse({
      persona: "ADMIN",
      email: "admin@platform.com",
      password: "adminpass1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permissions.canModerateUsers).toBe(false);
    }
  });

  it("accepts an admin creation payload with explicit permissions", () => {
    const result = createAdminSchema.safeParse({
      persona: "ADMIN",
      email: "admin@platform.com",
      password: "adminpass1",
      permissions: { canModerateUsers: true, canViewAuditLogs: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permissions.canModerateUsers).toBe(true);
      expect(result.data.permissions.canViewAuditLogs).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Discriminated union
  // -------------------------------------------------------------------------

  it("routes FAN payload through the union schema", () => {
    const result = registerChordUserSchema.safeParse({
      persona: "FAN",
      email: "fan@example.com",
      password: "securepass1",
      displayName: "Listener",
    });
    expect(result.success).toBe(true);
  });

  it("routes ARTIST payload through the union schema", () => {
    const result = registerChordUserSchema.safeParse({
      persona: "ARTIST",
      email: "artist@example.com",
      password: "securepass1",
      stageName: "The Band",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown persona through the union schema", () => {
    const result = registerChordUserSchema.safeParse({
      persona: "UNKNOWN",
      email: "x@example.com",
      password: "securepass1",
    });
    expect(result.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Moderation
  // -------------------------------------------------------------------------

  it("accepts a valid moderation update", () => {
    const result = moderateUserSchema.safeParse({
      moderationStatus: "SUSPENDED",
      moderationNote: "Repeated ToS violations",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid moderation status", () => {
    const result = moderateUserSchema.safeParse({ moderationStatus: "DELETED" });
    expect(result.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Consent
  // -------------------------------------------------------------------------

  it("accepts ACCEPTED consent update", () => {
    expect(updateConsentSchema.safeParse({ consentState: "ACCEPTED" }).success).toBe(true);
  });

  it("accepts WITHDRAWN consent update", () => {
    expect(updateConsentSchema.safeParse({ consentState: "WITHDRAWN" }).success).toBe(true);
  });

  it("rejects PENDING as a consent update (not a valid transition via this endpoint)", () => {
    expect(updateConsentSchema.safeParse({ consentState: "PENDING" }).success).toBe(false);
  });
});
