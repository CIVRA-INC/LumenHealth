import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Express } from "express";
import { staffRouter } from "../routes/staff.routes.js";
import { staffStore } from "../repositories/staff.repository.js";
import { invitationStore } from "../repositories/invitation.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";
import { createStaffFromInvitation } from "../services/staff.service.js";
import type { UserRole } from "@lumen/types";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/staff", staffRouter);
  return app;
}

async function req(
  app: Express,
  method: "GET" | "PATCH",
  path: string,
  body?: unknown,
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
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
        .then(async (res) => {
          const json = await res.json();
          server.close();
          resolve({ status: res.status, body: json });
        })
        .catch((err) => { server.close(); reject(err); });
    });
  });
}

function tokenWithRole(clinicId: string, role: UserRole): string {
  return accessTokenSigner.sign({ sub: `user-${role}-${clinicId}`, clinicId, role });
}

describe("GET /api/v1/staff — list", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    invitationStore._reset();
    staffStore._reset();
  });

  it("returns 200 with an empty list when no staff exist", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "GET", "/api/v1/staff", undefined, a.token);
    expect(status).toBe(200);
    expect((body as { staff: unknown[] }).staff).toHaveLength(0);
  });

  it("returns only staff scoped to the caller's clinic", async () => {
    const { a, b } = buildTwoClinicFixture();
    createStaffFromInvitation("u1", a.clinicId, "alice@a.test", "Alice", "clinician");
    createStaffFromInvitation("u2", b.clinicId, "bob@b.test", "Bob", "admin");

    const { status, body } = await req(app, "GET", "/api/v1/staff", undefined, a.token);
    expect(status).toBe(200);
    const staff = (body as { staff: { email: string }[] }).staff;
    expect(staff).toHaveLength(1);
    expect(staff[0].email).toBe("alice@a.test");
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "GET", "/api/v1/staff");
    expect(status).toBe(401);
  });

  it("allows a clinician to list staff", async () => {
    const { a } = buildTwoClinicFixture();
    createStaffFromInvitation("u1", a.clinicId, "alice@a.test", "Alice", "clinician");
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(app, "GET", "/api/v1/staff", undefined, clinicianToken);
    expect(status).toBe(200);
  });
});

describe("PATCH /api/v1/staff/:staffId/role — updateRole", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    invitationStore._reset();
    staffStore._reset();
  });

  it("returns 200 with updated staff on valid role change", async () => {
    const { a } = buildTwoClinicFixture();
    const member = createStaffFromInvitation("u1", a.clinicId, "alice@a.test", "Alice", "clinician");

    const { status, body } = await req(
      app,
      "PATCH",
      `/api/v1/staff/${member.staffId}/role`,
      { role: "admin" },
      a.token,
    );
    expect(status).toBe(200);
    expect((body as { staff: { role: string } }).staff.role).toBe("admin");
  });

  it("returns 400 when role is 'owner'", async () => {
    const { a } = buildTwoClinicFixture();
    const member = createStaffFromInvitation("u1", a.clinicId, "alice@a.test", "Alice", "clinician");

    const { status, body } = await req(
      app,
      "PATCH",
      `/api/v1/staff/${member.staffId}/role`,
      { role: "owner" },
      a.token,
    );
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("role");
  });

  it("returns 403 when a clinician tries to update a role", async () => {
    const { a } = buildTwoClinicFixture();
    const member = createStaffFromInvitation("u1", a.clinicId, "alice@a.test", "Alice", "clinician");
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");

    const { status } = await req(
      app,
      "PATCH",
      `/api/v1/staff/${member.staffId}/role`,
      { role: "admin" },
      clinicianToken,
    );
    expect(status).toBe(403);
  });

  it("returns 404 for a staffId that does not belong to the caller's clinic", async () => {
    const { a, b } = buildTwoClinicFixture();
    const memberB = createStaffFromInvitation("u2", b.clinicId, "bob@b.test", "Bob", "clinician");

    const { status } = await req(
      app,
      "PATCH",
      `/api/v1/staff/${memberB.staffId}/role`,
      { role: "admin" },
      a.token,
    );
    expect(status).toBe(404);
  });

  it("returns 403 when an admin tries to change their own role", async () => {
    const { a } = buildTwoClinicFixture();
    // a.userId is "user-isolation-a" — create a staff record tied to that same userId
    const self = createStaffFromInvitation(a.userId, a.clinicId, "owner@a.test", "Owner A", "admin");

    const { status, body } = await req(
      app,
      "PATCH",
      `/api/v1/staff/${self.staffId}/role`,
      { role: "clinician" },
      a.token,
    );
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("STAFF_CANNOT_SELF_UPDATE");
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "PATCH", "/api/v1/staff/any-id/role", { role: "admin" });
    expect(status).toBe(401);
  });
});
