import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import * as request from "supertest";

import { AuthModule } from "../auth.module.js";
import { _resetAuthStateForTests } from "../controllers/auth.controller.js";
import { identityStore } from "../repositories/identity.repository.js";
import { sessionStore } from "../repositories/session.repository.js";
import { clinicStore } from "../../clinic/repositories/clinic.repository.js";
import { staffStore } from "../../staff/repositories/staff.repository.js";
import { auditStore } from "../../audit/repositories/audit.repository.js";
import { FIXTURE_PASSWORD_HASH, FIXTURE_PASSWORD_PLAINTEXT } from "./fixtures.js";

const seed = () => {
  clinicStore.save({ clinicId: "c1", name: "C", slug: "c", address: "a", phone: "p", email: "e", status: "active", ownerId: "u1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  identityStore.save({ userId: "u1", clinicId: "c1", email: "u1@clinic.test", passwordHash: FIXTURE_PASSWORD_HASH, role: "owner", status: "active", createdAt: new Date().toISOString() });
  identityStore.save({ userId: "u2", clinicId: "c1", email: "u2@clinic.test", passwordHash: FIXTURE_PASSWORD_HASH, role: "staff", status: "active", createdAt: new Date().toISOString() });
  staffStore.save({ staffId: "s1", clinicId: "c1", userId: "u1", name: "Owner", email: "u1@clinic.test", role: "owner", status: "active", joinedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  staffStore.save({ staffId: "s2", clinicId: "c1", userId: "u2", name: "Staff", email: "u2@clinic.test", role: "staff", status: "active", joinedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
};

describe("DELETE /auth/me (#1462)", () => {
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
    staffStore._reset();
    (auditStore as any)._reset?.();
    auditStore.findAll().forEach((e) => (auditStore as any).delete?.(e.auditId));
    seed();
  });
  const server = () => request.default(app.getHttpServer());
  const login = async (email = "u2@clinic.test") => {
    const res = await server().post("/api/v1/auth/login").send({ email, password: FIXTURE_PASSWORD_PLAINTEXT });
    return res.body.session;
  };

  it("wrong password returns 401 and deletes nothing", async () => {
    const session = await login();
    const res = await server().delete("/api/v1/auth/me").set("Authorization", `Bearer ${session.accessToken}`).send({ password: "wrong" });
    expect(res.status).toBe(401);
    expect(identityStore.findById("u2")).toBeDefined();
  });

  it("sole owner gets 409", async () => {
    staffStore._reset();
    staffStore.save({ staffId: "s1", clinicId: "c1", userId: "u1", name: "Owner", email: "u1@clinic.test", role: "owner", status: "active", joinedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const session = await login("u1@clinic.test");
    const res = await server().delete("/api/v1/auth/me").set("Authorization", `Bearer ${session.accessToken}`).send({ password: FIXTURE_PASSWORD_PLAINTEXT });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("OWNER_REQUIRED");
  });

  it("deletes account, sessions, deactivates staff, keeps anonymized audit", async () => {
    const session = await login();
    const res = await server().delete("/api/v1/auth/me").set("Authorization", `Bearer ${session.accessToken}`).send({ password: FIXTURE_PASSWORD_PLAINTEXT });
    expect(res.status).toBe(204);
    expect(identityStore.findById("u2")).toBeUndefined();
    expect(sessionStore.findByRefreshToken(session.refreshToken)).toBeUndefined();
    const staff = staffStore.findByUserId("u2");
    expect(!staff || staff.status !== "active").toBe(true);
    const audits = auditStore.findAll();
    const deletionAudit = audits.find((e) => e.actorId === "u2" && e.action === "staff.deactivated");
    expect(deletionAudit).toBeDefined();
    expect(JSON.stringify(deletionAudit)).not.toContain("u2@clinic.test");
  });
});
