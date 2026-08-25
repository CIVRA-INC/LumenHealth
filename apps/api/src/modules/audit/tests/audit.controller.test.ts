import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Express } from "express";
import { auditRouter } from "../routes/index.js";
import { auditStore } from "../repositories/audit.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";
import { recordAudit } from "../services/audit.service.js";
import type { UserRole } from "@lumen/types";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/audit", auditRouter);
  return app;
}

async function req(
  app: Express,
  method: "GET",
  path: string,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
        .then(async (res) => {
          const json = await res.json();
          server.close();
          resolve({ status: res.status, body: json });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

function tokenWithRole(clinicId: string, role: UserRole): string {
  return accessTokenSigner.sign({ sub: `user-${role}-${clinicId}`, clinicId, role });
}

function seedAuditEntries(clinicId: string) {
  recordAudit({
    clinicId,
    action: "staff.invited",
    actorId: "actor-1",
    actorRole: "owner",
    targetId: "invite-1",
    targetType: "invitation",
  });
  recordAudit({
    clinicId,
    action: "staff.role_changed",
    actorId: "actor-1",
    actorRole: "owner",
    targetId: "staff-1",
    targetType: "staff",
    before: { role: "clinician" },
    after: { role: "admin" },
  });
  recordAudit({
    clinicId,
    action: "clinic.updated",
    actorId: "actor-1",
    actorRole: "admin",
    targetId: clinicId,
    targetType: "clinic",
  });
}

describe("GET /api/v1/audit", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    auditStore._reset();
  });

  it("returns 200 with audit entries for the caller's clinic", async () => {
    const { a } = buildTwoClinicFixture();
    seedAuditEntries(a.clinicId);

    const { status, body } = await req(app, "GET", "/api/v1/audit", a.token);
    expect(status).toBe(200);
    const b = body as { entries: unknown[]; total: number };
    expect(b.entries).toHaveLength(3);
    expect(b.total).toBe(3);
  });

  it("scopes entries to the caller's clinic only", async () => {
    const { a, b } = buildTwoClinicFixture();
    seedAuditEntries(a.clinicId);
    seedAuditEntries(b.clinicId);

    const { body } = await req(app, "GET", "/api/v1/audit", a.token);
    const result = body as { entries: { clinicId: string }[]; total: number };
    expect(result.total).toBe(3);
    expect(result.entries.every((e) => e.clinicId === a.clinicId)).toBe(true);
  });

  it("filters by action query parameter", async () => {
    const { a } = buildTwoClinicFixture();
    seedAuditEntries(a.clinicId);

    const { status, body } = await req(
      app,
      "GET",
      "/api/v1/audit?action=staff.invited",
      a.token,
    );
    expect(status).toBe(200);
    const result = body as { entries: { action: string }[]; total: number };
    expect(result.total).toBe(1);
    expect(result.entries[0].action).toBe("staff.invited");
  });

  it("returns empty list when no entries exist", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "GET", "/api/v1/audit", a.token);
    expect(status).toBe(200);
    const result = body as { entries: unknown[]; total: number };
    expect(result.entries).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("supports pagination with page and limit", async () => {
    const { a } = buildTwoClinicFixture();
    seedAuditEntries(a.clinicId);

    const { body } = await req(
      app,
      "GET",
      "/api/v1/audit?page=1&limit=2",
      a.token,
    );
    const result = body as { entries: unknown[]; total: number };
    expect(result.entries).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it("returns 403 for clinician role", async () => {
    const { a } = buildTwoClinicFixture();
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(app, "GET", "/api/v1/audit", clinicianToken);
    expect(status).toBe(403);
  });

  it("returns 403 for cashier role", async () => {
    const { a } = buildTwoClinicFixture();
    const cashierToken = tokenWithRole(a.clinicId, "cashier");
    const { status } = await req(app, "GET", "/api/v1/audit", cashierToken);
    expect(status).toBe(403);
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "GET", "/api/v1/audit");
    expect(status).toBe(401);
  });

  it("includes before/after snapshots in role change entries", async () => {
    const { a } = buildTwoClinicFixture();
    seedAuditEntries(a.clinicId);

    const { body } = await req(
      app,
      "GET",
      "/api/v1/audit?action=staff.role_changed",
      a.token,
    );
    const result = body as {
      entries: { before: Record<string, unknown>; after: Record<string, unknown> }[];
    };
    expect(result.entries[0].before).toEqual({ role: "clinician" });
    expect(result.entries[0].after).toEqual({ role: "admin" });
  });
});
