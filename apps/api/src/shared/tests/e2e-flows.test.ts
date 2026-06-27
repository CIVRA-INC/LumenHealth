import { describe, it, expect, beforeEach } from "vitest";
import type { Express } from "express";
import { app } from "../../app.js";
import { identityStore } from "../../modules/auth/repositories/identity.repository.js";
import { sessionStore } from "../../modules/auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../modules/auth/controllers/auth.controller.js";
import { invitationStore } from "../../modules/staff/repositories/invitation.repository.js";
import { staffStore } from "../../modules/staff/repositories/staff.repository.js";
import { auditStore } from "../../modules/audit/repositories/audit.repository.js";
import { clinicStore } from "../../modules/clinic/repositories/clinic.repository.js";

type Body = Record<string, unknown>;

async function request(
  application: Express,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: Body }> {
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(application);
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
          resolve({ status: res.status, body: json as Body });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

function resetAll() {
  _resetAuthStateForTests();
  identityStore._reset();
  sessionStore._reset();
  invitationStore._reset();
  staffStore._reset();
  auditStore._reset();
  clinicStore._reset();
}

describe("E2E: register → create clinic → invite staff → accept", () => {
  beforeEach(resetAll);

  it("completes the full onboarding flow", async () => {
    // 1. Register owner
    const reg = await request(app, "POST", "/api/v1/auth/register", {
      email: "owner@newclinic.test",
      password: "OwnerPass1!",
      clinicName: "Sunrise Clinic",
    });
    expect(reg.status).toBe(201);
    const ownerToken = (reg.body.session as Body).accessToken as string;
    const clinicId = (reg.body.session as Body).clinicId as string;

    // 2. Create clinic record in clinic module
    const createClinic = await request(
      app,
      "POST",
      "/api/v1/clinics",
      { name: "Sunrise Clinic", address: "123 Health Ave", phone: "+1-555-0100", email: "info@sunrise.test" },
      ownerToken,
    );
    expect(createClinic.status).toBe(201);

    // 3. Verify clinic can be fetched
    const getClinic = await request(
      app,
      "GET",
      `/api/v1/clinics/${clinicId}`,
      undefined,
      ownerToken,
    );
    expect(getClinic.status).toBe(200);
    expect((getClinic.body.clinic as Body).name).toBe("Sunrise Clinic");

    // 4. Update clinic
    const updateClinic = await request(
      app,
      "PATCH",
      `/api/v1/clinics/${clinicId}`,
      { phone: "+1-555-0199" },
      ownerToken,
    );
    expect(updateClinic.status).toBe(200);
    expect((updateClinic.body.clinic as Body).phone).toBe("+1-555-0199");

    // 5. Send staff invitation
    const invite = await request(
      app,
      "POST",
      "/api/v1/staff/invitations",
      { email: "dr.jones@newclinic.test", role: "clinician" },
      ownerToken,
    );
    expect(invite.status).toBe(201);
    const inviteToken = (invite.body.invitation as Body).token as string;
    expect(inviteToken).toHaveLength(64);

    // 6. Accept invitation (public, no auth)
    const accept = await request(
      app,
      "POST",
      "/api/v1/staff/invitations/accept",
      { token: inviteToken, password: "DrJones1!", name: "Dr. Jones" },
    );
    expect(accept.status).toBe(201);
    expect(accept.body.userId).toBeDefined();

    // 7. Verify invitation is now accepted
    const listInvites = await request(
      app,
      "GET",
      "/api/v1/staff/invitations",
      undefined,
      ownerToken,
    );
    expect(listInvites.status).toBe(200);
    const invitations = listInvites.body.invitations as Body[];
    const accepted = invitations.find((i) => i.email === "dr.jones@newclinic.test");
    expect(accepted?.status).toBe("accepted");
  });
});

describe("E2E: clinic isolation across two tenants", () => {
  beforeEach(resetAll);

  it("tenant A cannot see tenant B's data across all modules", async () => {
    // Register two owners
    const regA = await request(app, "POST", "/api/v1/auth/register", {
      email: "ownerA@a.test",
      password: "OwnerA1!!",
      clinicName: "Clinic Alpha",
    });
    const regB = await request(app, "POST", "/api/v1/auth/register", {
      email: "ownerB@b.test",
      password: "OwnerB1!!",
      clinicName: "Clinic Beta",
    });
    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);

    const tokenA = (regA.body.session as Body).accessToken as string;
    const tokenB = (regB.body.session as Body).accessToken as string;
    const clinicIdA = (regA.body.session as Body).clinicId as string;
    const clinicIdB = (regB.body.session as Body).clinicId as string;

    // Create clinic records
    await request(app, "POST", "/api/v1/clinics",
      { name: "Clinic Alpha", address: "1 A St", phone: "555-0001", email: "a@a.test" }, tokenA);
    await request(app, "POST", "/api/v1/clinics",
      { name: "Clinic Beta", address: "2 B St", phone: "555-0002", email: "b@b.test" }, tokenB);

    // A sends invitation
    const invA = await request(
      app,
      "POST",
      "/api/v1/staff/invitations",
      { email: "staffA@a.test", role: "admin" },
      tokenA,
    );
    expect(invA.status).toBe(201);

    // B sends invitation
    const invB = await request(
      app,
      "POST",
      "/api/v1/staff/invitations",
      { email: "staffB@b.test", role: "cashier" },
      tokenB,
    );
    expect(invB.status).toBe(201);

    // A lists invitations — should only see A's
    const listA = await request(
      app,
      "GET",
      "/api/v1/staff/invitations",
      undefined,
      tokenA,
    );
    expect(listA.status).toBe(200);
    const invitationsA = listA.body.invitations as Body[];
    expect(invitationsA).toHaveLength(1);
    expect(invitationsA[0].email).toBe("staffA@a.test");

    // A cannot access B's clinic
    const crossClinic = await request(
      app,
      "GET",
      `/api/v1/clinics/${clinicIdB}`,
      undefined,
      tokenA,
    );
    expect(crossClinic.status).toBe(403);

    // B cannot access A's clinic
    const crossClinic2 = await request(
      app,
      "GET",
      `/api/v1/clinics/${clinicIdA}`,
      undefined,
      tokenB,
    );
    expect(crossClinic2.status).toBe(403);
  });
});

describe("E2E: role-based access control", () => {
  beforeEach(resetAll);

  it("clinician cannot send invitations or view audit logs", async () => {
    // Register owner
    const reg = await request(app, "POST", "/api/v1/auth/register", {
      email: "owner@rbac.test",
      password: "OwnerRbac1!",
      clinicName: "RBAC Clinic",
    });
    const ownerToken = (reg.body.session as Body).accessToken as string;

    // Invite a clinician
    const invite = await request(
      app,
      "POST",
      "/api/v1/staff/invitations",
      { email: "clinician@rbac.test", role: "clinician" },
      ownerToken,
    );
    const inviteToken = (invite.body.invitation as Body).token as string;

    // Accept as clinician
    const accept = await request(
      app,
      "POST",
      "/api/v1/staff/invitations/accept",
      { token: inviteToken, password: "Clinician1!", name: "Dr. Clinician" },
    );
    expect(accept.status).toBe(201);

    // Login as clinician
    const login = await request(app, "POST", "/api/v1/auth/login", {
      email: "clinician@rbac.test",
      password: "Clinician1!",
    });
    expect(login.status).toBe(200);
    const clinicianToken = (login.body.session as Body).accessToken as string;

    // Clinician cannot send invitations
    const sendInv = await request(
      app,
      "POST",
      "/api/v1/staff/invitations",
      { email: "another@rbac.test", role: "cashier" },
      clinicianToken,
    );
    expect(sendInv.status).toBe(403);

    // Clinician cannot view audit logs
    const audit = await request(
      app,
      "GET",
      "/api/v1/audit",
      undefined,
      clinicianToken,
    );
    expect(audit.status).toBe(403);
  });
});

describe("E2E: health check", () => {
  it("returns service status", async () => {
    const res = await request(app, "GET", "/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("api");
    expect(res.body.status).toBe("ok");
  });
});
