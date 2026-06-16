// Seed-safe auth fixtures — Closes #464
// Pre-hashed passwords use bcrypt cost 12. Plaintext counterparts are listed
// alongside each fixture so tests can call bcrypt.compare without re-hashing.

import type { AuthSession, LoginRequest, MeResponse, RegisterRequest, UserRole } from "@lumen/types";

// ---------------------------------------------------------------------------
// Stable IDs (deterministic, safe to commit)
// ---------------------------------------------------------------------------

export const FIXTURE_IDS = {
  ownerUserId: "user-fixture-owner-001",
  adminUserId: "user-fixture-admin-001",
  clinicianUserId: "user-fixture-clinician-001",
  clinicId: "clinic-fixture-001",
} as const;

// ---------------------------------------------------------------------------
// Pre-hashed passwords (bcrypt, cost 12)
// Plaintext: "Fixture$1" for all seed users — never use in production.
// ---------------------------------------------------------------------------

export const FIXTURE_PASSWORD_PLAINTEXT = "Fixture$1";

export const FIXTURE_PASSWORD_HASH =
  "$2b$12$3QCxqOQm6xHHo0ZmTz84ouyEnH89cjd/K7ZQvYonBARNe5WwVqh8.";

// ---------------------------------------------------------------------------
// User fixtures
// ---------------------------------------------------------------------------

type UserFixture = {
  userId: string;
  clinicId: string;
  role: UserRole;
  email: string;
  passwordHash: string;
};

export const FIXTURE_USERS: Record<string, UserFixture> = {
  owner: {
    userId: FIXTURE_IDS.ownerUserId,
    clinicId: FIXTURE_IDS.clinicId,
    role: "owner",
    email: "owner@clinic.test",
    passwordHash: FIXTURE_PASSWORD_HASH,
  },
  admin: {
    userId: FIXTURE_IDS.adminUserId,
    clinicId: FIXTURE_IDS.clinicId,
    role: "admin",
    email: "admin@clinic.test",
    passwordHash: FIXTURE_PASSWORD_HASH,
  },
  clinician: {
    userId: FIXTURE_IDS.clinicianUserId,
    clinicId: FIXTURE_IDS.clinicId,
    role: "clinician",
    email: "clinician@clinic.test",
    passwordHash: FIXTURE_PASSWORD_HASH,
  },
};

// ---------------------------------------------------------------------------
// Request fixtures
// ---------------------------------------------------------------------------

export const FIXTURE_REGISTER_REQUEST: RegisterRequest = {
  email: "newowner@clinic.test",
  password: FIXTURE_PASSWORD_PLAINTEXT,
  clinicName: "Test Clinic",
};

export const FIXTURE_LOGIN_REQUEST: LoginRequest = {
  email: FIXTURE_USERS.owner.email,
  password: FIXTURE_PASSWORD_PLAINTEXT,
};

// ---------------------------------------------------------------------------
// Session / response fixtures
// ---------------------------------------------------------------------------

export const FIXTURE_SESSION: AuthSession = {
  userId: FIXTURE_IDS.ownerUserId,
  clinicId: FIXTURE_IDS.clinicId,
  role: "owner",
  accessToken: "fixture-access-token",
};

export const FIXTURE_ME_RESPONSE: MeResponse = {
  userId: FIXTURE_IDS.ownerUserId,
  clinicId: FIXTURE_IDS.clinicId,
  role: "owner",
  email: FIXTURE_USERS.owner.email,
};
