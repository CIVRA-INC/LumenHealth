import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Express } from "express";
import { invitationRouter } from "../routes/index.js";
import { invitationStore } from "../repositories/invitation.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";
import type { UserRole } from "@lumen/types";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/staff/invitations", invitationRouter);
  return app;
}

async function req(
  app: Express,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
  token?: string
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

const VALID_INVITE = { email: "dr.okafor@clinic.test", role: "clinician" };

describe("POST /api/v1/staff/invitations — send", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    invitationStore._reset();
  });

  it("returns 201 with an invitation on valid input", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "POST", "/api/v1/staff/invitations", VALID_INVITE, a.token);
    expect(status).toBe(201);
    const inv = (body as { invitation: { status: string; email: string; token: string } }).invitation;
    expect(inv.status).toBe("pending");
    expect(inv.email).toBe(VALID_INVITE.email);
    expect(inv.token).toHaveLength(64); // 32 bytes hex
  });

  it("returns 400 when email is invalid", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "POST", "/api/v1/staff/invitations", { ...VALID_INVITE, email: "not-email" }, a.token);
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("email");
  });

  it("returns 400 when role is 'owner'", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "POST", "/api/v1/staff/invitations", { email: "x@y.com", role: "owner" }, a.token);
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("role");
  });

  it("returns 403 when a clinician tries to send an invitation", async () => {
    const { a } = buildTwoClinicFixture();
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(app, "POST", "/api/v1/staff/invitations", VALID_INVITE, clinicianToken);
    expect(status).toBe(403);
  });

  it("returns 409 on duplicate pending invitation to same email", async () => {
    const { a } = buildTwoClinicFixture();
    await req(app, "POST", "/api/v1/staff/invitations", VALID_INVITE, a.token);
    const { status, body } = await req(app, "POST", "/api/v1/staff/invitations", VALID_INVITE, a.token);
    expect(status).toBe(409);
    expect((body as { error: string }).error).toBe("INVITATION_ALREADY_PENDING");
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "POST", "/api/v1/staff/invitations", VALID_INVITE);
    expect(status).toBe(401);
  });
});

describe("POST /api/v1/staff/invitations/accept — accept", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    invitationStore._reset();
  });

  it("returns 201 and creates an identity when token is valid", async () => {
    const { a } = buildTwoClinicFixture();
    const { body: sent } = await req(app, "POST", "/api/v1/staff/invitations", VALID_INVITE, a.token);
    const token = (sent as { invitation: { token: string } }).invitation.token;

    const { status, body } = await req(app, "POST", "/api/v1/staff/invitations/accept", {
      token,
      password: "SecurePass1!",
      name: "Dr. Okafor",
    });
    expect(status).toBe(201);
    expect(typeof (body as { userId: string }).userId).toBe("string");
  });

  it("returns 404 for an unknown token", async () => {
    const { status, body } = await req(app, "POST", "/api/v1/staff/invitations/accept", {
      token: "a".repeat(64),
      password: "SecurePass1!",
      name: "Nobody",
    });
    expect(status).toBe(404);
    expect((body as { error: string }).error).toBe("INVITATION_NOT_FOUND");
  });

  it("returns 409 when trying to accept an already-accepted invitation", async () => {
    const { a } = buildTwoClinicFixture();
    const { body: sent } = await req(app, "POST", "/api/v1/staff/invitations", VALID_INVITE, a.token);
    const token = (sent as { invitation: { token: string } }).invitation.token;

    await req(app, "POST", "/api/v1/staff/invitations/accept", { token, password: "SecurePass1!", name: "Dr. Okafor" });
    const { status, body } = await req(app, "POST", "/api/v1/staff/invitations/accept", { token, password: "SecurePass1!", name: "Dr. Okafor" });
    expect(status).toBe(409);
    expect((body as { error: string }).error).toBe("INVITATION_ALREADY_ACCEPTED");
  });
});

describe("GET /api/v1/staff/invitations — list", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    invitationStore._reset();
  });

  it("returns all invitations scoped to the caller's clinic", async () => {
    const { a, b } = buildTwoClinicFixture();
    await req(app, "POST", "/api/v1/staff/invitations", VALID_INVITE, a.token);
    await req(app, "POST", "/api/v1/staff/invitations", { email: "other@b.test", role: "admin" }, b.token);

    const { status, body } = await req(app, "GET", "/api/v1/staff/invitations", undefined, a.token);
    expect(status).toBe(200);
    const invitations = (body as { invitations: unknown[] }).invitations;
    expect(invitations).toHaveLength(1);
  });
});
