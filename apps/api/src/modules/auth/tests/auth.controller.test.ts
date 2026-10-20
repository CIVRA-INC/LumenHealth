import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import * as request from "supertest";

import { AuthModule } from "../auth.module.js";
import { _resetAuthStateForTests } from "../controllers/auth.controller.js";
import { identityStore } from "../repositories/identity.repository.js";
import { sessionStore } from "../repositories/session.repository.js";
import { accessTokenSigner } from "../services/token.service.js";
import { FIXTURE_PASSWORD_PLAINTEXT, FIXTURE_PASSWORD_HASH } from "./fixtures.js";
import type { AuthIdentity, AccountStatus } from "../types/index.js";

/**
 * End-to-end tests for `AuthController` through a real Nest application.
 *
 * Rewritten for #1301: the previous version booted the deleted Express
 * `authRouter` and exercised a `/auth/register` endpoint that no longer exists.
 * It now matches the Nest controller's actual surface.
 */

let identityCounter = 0;

function seedIdentity(overrides: Partial<AuthIdentity> = {}): AuthIdentity {
  identityCounter += 1;
  const identity: AuthIdentity = {
    userId: overrides.userId ?? `auth-test-user-${identityCounter}`,
    clinicId: overrides.clinicId ?? "auth-test-clinic",
    email: overrides.email ?? `user${identityCounter}@clinic.test`,
    passwordHash: overrides.passwordHash ?? FIXTURE_PASSWORD_HASH,
    role: overrides.role ?? "owner",
    status: overrides.status ?? ("active" as AccountStatus),
    createdAt: new Date().toISOString(),
  };
  identityStore.save(identity);
  return identity;
}

describe("AuthController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
  });

  const server = () => request.default(app.getHttpServer());

  describe("POST /api/v1/auth/login — validation failures", () => {
    it("returns 400 AUTH_MISSING_CREDENTIALS when email is missing", async () => {
      const res = await server()
        .post("/api/v1/auth/login")
        .send({ password: "Passw0rd!" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("AUTH_MISSING_CREDENTIALS");
    });

    it("returns 400 AUTH_MISSING_CREDENTIALS when password is missing", async () => {
      const res = await server()
        .post("/api/v1/auth/login")
        .send({ email: "owner@clinic.test" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("AUTH_MISSING_CREDENTIALS");
    });

    it("returns 400 AUTH_MISSING_CREDENTIALS when the body is empty", async () => {
      const res = await server().post("/api/v1/auth/login").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("AUTH_MISSING_CREDENTIALS");
    });
  });

  describe("POST /api/v1/auth/login — success and failure paths", () => {
    it("returns 200 with a verifiable session on valid credentials", async () => {
      seedIdentity({ email: "login@clinic.test" });

      const res = await server()
        .post("/api/v1/auth/login")
        .send({ email: "login@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });

      expect(res.status).toBe(201);
      const { session } = res.body;
      expect(typeof session.accessToken).toBe("string");
      // A real, signed JWT (three dot-separated segments), not an opaque token.
      expect(session.accessToken.split(".")).toHaveLength(3);
      expect(accessTokenSigner.verify(session.accessToken)).not.toBeNull();
      expect(typeof session.refreshToken).toBe("string");
    });

    it("returns 401 AUTH_INVALID_CREDENTIALS for the wrong password", async () => {
      seedIdentity({ email: "wrongpw@clinic.test" });

      const res = await server()
        .post("/api/v1/auth/login")
        .send({ email: "wrongpw@clinic.test", password: "WrongPassword!" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("AUTH_INVALID_CREDENTIALS");
    });

    it("returns 401 AUTH_INVALID_CREDENTIALS for a non-existent account", async () => {
      const res = await server()
        .post("/api/v1/auth/login")
        .send({ email: "ghost@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("AUTH_INVALID_CREDENTIALS");
    });

    it("returns 403 when the account is suspended", async () => {
      seedIdentity({ email: "suspended@clinic.test", status: "suspended" });

      const res = await server()
        .post("/api/v1/auth/login")
        .send({ email: "suspended@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("AUTH_FORBIDDEN");
    });

    it("returns 423 when the account is locked", async () => {
      seedIdentity({ email: "locked@clinic.test", status: "locked" });

      const res = await server()
        .post("/api/v1/auth/login")
        .send({ email: "locked@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });

      expect(res.status).toBe(423);
      expect(res.body.error).toBe("AUTH_ACCOUNT_LOCKED");
    });
  });

  describe("POST /api/v1/auth/login — rate limiting", () => {
    it("returns 429 after repeated requests from the same source", async () => {
      let lastStatus = 200;
      for (let i = 0; i < 11; i += 1) {
        const res = await server()
          .post("/api/v1/auth/login")
          .set("x-forwarded-for", "9.9.9.9")
          .send({ email: "ghost@clinic.test", password: "Passw0rd!" });
        lastStatus = res.status;
      }
      expect(lastStatus).toBe(429);
    });
  });

  describe("GET /api/v1/auth/me — token validation failures", () => {
    it("returns 401 when the Authorization header is absent", async () => {
      const res = await server().get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns 401 when the Authorization header is not Bearer", async () => {
      const res = await server()
        .get("/api/v1/auth/me")
        .set("Authorization", "Basic dXNlcjpwYXNz");
      expect(res.status).toBe(401);
    });

    it("returns 401 for an unrecognised bearer token", async () => {
      const res = await server()
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer not-a-real-token");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/auth/me — success", () => {
    it("returns the caller's identity for a valid token", async () => {
      const identity = seedIdentity({ email: "me@clinic.test" });
      const token = accessTokenSigner.sign({
        sub: identity.userId,
        clinicId: identity.clinicId,
        role: identity.role,
      });

      const res = await server()
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(identity.userId);
      expect(res.body.clinicId).toBe(identity.clinicId);
      expect(res.body.role).toBe("owner");
      expect(res.body.email).toBe(identity.email);
    });
  });

  describe("GET /api/v1/auth/owner-only", () => {
    it("returns 401 without a bearer token", async () => {
      const res = await server().get("/api/v1/auth/owner-only");
      expect(res.status).toBe(401);
    });

    it("returns 200 for an owner token", async () => {
      const identity = seedIdentity({ email: "owner-only@clinic.test", role: "owner" });
      const token = accessTokenSigner.sign({
        sub: identity.userId,
        clinicId: identity.clinicId,
        role: "owner",
      });

      const res = await server()
        .get("/api/v1/auth/owner-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it("returns 403 for a non-owner token", async () => {
      const identity = seedIdentity({ email: "clinician@clinic.test", role: "clinician" });
      const token = accessTokenSigner.sign({
        sub: identity.userId,
        clinicId: identity.clinicId,
        role: "clinician",
      });

      const res = await server()
        .get("/api/v1/auth/owner-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("AUTH_FORBIDDEN");
    });
  });

  describe("POST /api/v1/auth/refresh — validation", () => {
    it("returns 401 when the refresh token is missing", async () => {
      const res = await server().post("/api/v1/auth/refresh").send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("AUTH_TOKEN_INVALID");
    });

    it("returns 401 for an invalid refresh token", async () => {
      const res = await server()
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: "bad-token" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("AUTH_TOKEN_INVALID");
    });

    it("rotates the refresh token and issues a new access token", async () => {
      seedIdentity({ email: "refresh@clinic.test" });
      const login = await server()
        .post("/api/v1/auth/login")
        .send({ email: "refresh@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });
      const { refreshToken } = login.body.session;

      const res = await server()
        .post("/api/v1/auth/refresh")
        .send({ refreshToken });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.accessToken).toBe("string");
      expect(accessTokenSigner.verify(res.body.accessToken)).not.toBeNull();
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });
  });

  describe("POST /api/v1/auth/password-reset/request", () => {
    it("returns 200 for a reset request", async () => {
      const res = await server()
        .post("/api/v1/auth/password-reset/request")
        .send({ email: "owner@clinic.test" });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
    });

    it("returns 400 when the email is missing", async () => {
      const res = await server().post("/api/v1/auth/password-reset/request").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("AUTH_MISSING_CREDENTIALS");
    });
  });

  describe("POST /api/v1/auth/password-reset/confirm", () => {
    it("returns 400 when the token or password is missing", async () => {
      const res = await server()
        .post("/api/v1/auth/password-reset/confirm")
        .send({ token: "abc" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("AUTH_MISSING_CREDENTIALS");
    });

    it("returns 401 for an unknown reset token", async () => {
      const res = await server()
        .post("/api/v1/auth/password-reset/confirm")
        .send({ token: "not-a-real-token", password: "Passw0rd!" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("AUTH_TOKEN_INVALID");
    });
  });

  describe("GET /api/v1/auth/metrics", () => {
    it("returns the auth metrics snapshot", async () => {
      const res = await server().get("/api/v1/auth/metrics");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.metrics).toBe("object");
    });
  });
});
