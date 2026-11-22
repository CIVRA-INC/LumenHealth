import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import * as request from "supertest";

import { AuthModule } from "../auth.module.js";
import { _resetAuthStateForTests } from "../controllers/auth.controller.js";
import { identityStore } from "../repositories/identity.repository.js";
import { sessionStore } from "../repositories/session.repository.js";
import { clinicStore } from "../../clinic/repositories/clinic.repository.js";
import { FIXTURE_PASSWORD_HASH, FIXTURE_PASSWORD_PLAINTEXT } from "./fixtures.js";

const clinic = (status: "active" | "archived" | "suspended") => ({
  clinicId: "c1",
  name: "Clinic",
  slug: "clinic",
  address: "addr",
  phone: "123",
  email: "c@clinic.test",
  status,
  ownerId: "u1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("Clinic status blocks auth (#1464)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({ imports: [AuthModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    clinicStore._reset();
    identityStore.save({ userId: "u1", clinicId: "c1", email: "u1@clinic.test", passwordHash: FIXTURE_PASSWORD_HASH, role: "owner", status: "active", createdAt: new Date().toISOString() });
  });
  const server = () => request.default(app.getHttpServer());

  it("blocks login when clinic is archived", async () => {
    clinicStore.save(clinic("archived"));
    const res = await server().post("/api/v1/auth/login").send({ email: "u1@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("AUTH_FORBIDDEN");
  });

  it("blocks login when clinic is suspended", async () => {
    clinicStore.save(clinic("suspended"));
    const res = await server().post("/api/v1/auth/login").send({ email: "u1@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });
    expect(res.status).toBe(403);
  });

  it("blocks refresh when clinic is archived", async () => {
    clinicStore.save(clinic("active"));
    const login = await server().post("/api/v1/auth/login").send({ email: "u1@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });
    clinicStore.save(clinic("archived"));
    const res = await server().post("/api/v1/auth/refresh").send({ refreshToken: login.body.session.refreshToken });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("AUTH_FORBIDDEN");
  });

  it("blocks guarded route when clinic is archived", async () => {
    clinicStore.save(clinic("active"));
    const login = await server().post("/api/v1/auth/login").send({ email: "u1@clinic.test", password: FIXTURE_PASSWORD_PLAINTEXT });
    clinicStore.save(clinic("archived"));
    const res = await server().get("/api/v1/auth/me").set("Authorization", `Bearer ${login.body.session.accessToken}`);
    expect(res.status).toBe(403);
  });
});
