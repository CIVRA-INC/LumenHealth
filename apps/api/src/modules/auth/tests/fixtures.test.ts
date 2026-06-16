// Auth 029 — Seed-safe fixture validation tests
// Ensures fixtures are structurally correct and passwords are properly hashed.

import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import {
  FIXTURE_USERS,
  FIXTURE_PASSWORD_PLAINTEXT,
  FIXTURE_PASSWORD_HASH,
  FIXTURE_SESSION,
  FIXTURE_ME_RESPONSE,
  FIXTURE_REGISTER_REQUEST,
  FIXTURE_LOGIN_REQUEST,
  FIXTURE_IDS,
} from "./fixtures.js";

describe("auth fixtures", () => {
  it("fixture password hash is a valid bcrypt hash at cost 12", () => {
    expect(FIXTURE_PASSWORD_HASH).toMatch(/^\$2[ab]\$12\$/);
  });

  it("fixture password hash verifies against plaintext", async () => {
    await expect(
      bcrypt.compare(FIXTURE_PASSWORD_PLAINTEXT, FIXTURE_PASSWORD_HASH)
    ).resolves.toBe(true);
  });

  it("fixture password hash rejects wrong plaintext", async () => {
    await expect(
      bcrypt.compare("WrongPassword!", FIXTURE_PASSWORD_HASH)
    ).resolves.toBe(false);
  });

  it("all user fixtures have consistent clinicId", () => {
    for (const user of Object.values(FIXTURE_USERS)) {
      expect(user.clinicId).toBe(FIXTURE_IDS.clinicId);
    }
  });

  it("all user fixtures have unique emails", () => {
    const emails = Object.values(FIXTURE_USERS).map((u) => u.email);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("all user fixture emails are lowercase", () => {
    for (const user of Object.values(FIXTURE_USERS)) {
      expect(user.email).toBe(user.email.toLowerCase());
    }
  });

  it("session fixture matches owner user fixture", () => {
    expect(FIXTURE_SESSION.userId).toBe(FIXTURE_USERS.owner.userId);
    expect(FIXTURE_SESSION.clinicId).toBe(FIXTURE_USERS.owner.clinicId);
    expect(FIXTURE_SESSION.role).toBe(FIXTURE_USERS.owner.role);
  });

  it("me response fixture matches owner user fixture", () => {
    expect(FIXTURE_ME_RESPONSE.userId).toBe(FIXTURE_USERS.owner.userId);
    expect(FIXTURE_ME_RESPONSE.email).toBe(FIXTURE_USERS.owner.email);
    expect(FIXTURE_ME_RESPONSE.role).toBe(FIXTURE_USERS.owner.role);
  });

  it("register request fixture has all required fields", () => {
    expect(FIXTURE_REGISTER_REQUEST.email).toBeTruthy();
    expect(FIXTURE_REGISTER_REQUEST.password).toBeTruthy();
    expect(FIXTURE_REGISTER_REQUEST.clinicName).toBeTruthy();
  });

  it("login request fixture matches owner email", () => {
    expect(FIXTURE_LOGIN_REQUEST.email).toBe(FIXTURE_USERS.owner.email);
  });
});
