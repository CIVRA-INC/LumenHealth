import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import * as request from "supertest";

import { AuthModule } from "../auth.module.js";
import { _resetAuthStateForTests } from "../controllers/auth.controller.js";
import { identityStore } from "../repositories/identity.repository.js";
import { sessionStore } from "../repositories/session.repository.js";
import { FIXTURE_PASSWORD_HASH, FIXTURE_PASSWORD_PLAINTEXT } from "./fixtures.js";
import type { AuthIdentity } from "../types/index.js";

function seedIdentity(overrides: Partial<AuthIdentity> = {}): AuthIdentity {
  const identity: AuthIdentity = {
    userId: overrides.userId ?? "refresh-ttl-user",
    clinicId: overrides.clinicId ?? "refresh-ttl-clinic",
    email: overrides.email ?? "refresh-ttl@clinic.test",
    passwordHash: overrides.passwordHash ?? FIXTURE_PASSWORD_HASH,
    role: overrides.role ?? "owner",
    status: overrides.status ?? "active",
    createdAt: new Date().toISOString(),
  };
  identityStore.save(identity);
  return identity;
}

describe("Auth refresh token TTL (#1465)", () => {
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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const server = () => request.default(app.getHttpServer());

  async function login() {
    seedIdentity();
    const res = await server()
      .post("/api/v1/auth/login")
      .send({ email: "refresh-ttl@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });
    expect(res.status).toBe(201);
    return res.body.session as { accessToken: string; refreshToken: string };
  }

  it("refresh succeeds within the refresh TTL", async () => {
    const session = await login();
    vi.advanceTimersByTime(60_000); // 1 minute, well within 7-day refresh TTL

    const res = await server()
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: session.refreshToken });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
  });

  it("refresh after refresh TTL returns 401 AUTH_TOKEN_EXPIRED and deletes session", async () => {
    const session = await login();
    vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000 + 1000); // past default 7-day refresh TTL

    const res = await server()
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: session.refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("AUTH_TOKEN_EXPIRED");
    expect(sessionStore.findByRefreshToken(session.refreshToken)).toBeUndefined();
  });

  it("access TTL is not coupled to refresh validity", async () => {
    const session = await login();
    vi.advanceTimersByTime(901_000); // past default 15-min access TTL, within refresh TTL

    const res = await server()
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: session.refreshToken });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});
