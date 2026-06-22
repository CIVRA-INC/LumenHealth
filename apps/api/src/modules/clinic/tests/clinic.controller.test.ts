import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Express } from "express";
import { clinicRouter } from "../routes/index.js";
import { clinicStore } from "../repositories/clinic.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";
import type { UserRole } from "@lumen/types";

// Build a token for a given role scoped to the same clinicId as fixture A.
// Used for role-guard tests where the caller is in the right clinic but
// lacks the permission to perform the action.
function tokenWithRole(clinicId: string, role: UserRole): string {
  return accessTokenSigner.sign({ sub: `user-${role}`, clinicId, role });
}

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/clinics", clinicRouter);
  return app;
}

async function req(
  app: Express,
  method: "GET" | "POST" | "PATCH" | "DELETE",
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

const VALID_BODY = {
  name: "Sunrise Clinic",
  address: "12 Main St, Lagos",
  phone: "+2348012345678",
  email: "admin@sunrise.clinic",
};

describe("POST /api/v1/clinics — create", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    clinicStore._reset();
  });

  it("returns 201 with a clinic object on valid input", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    expect(status).toBe(201);
    const clinic = (body as { clinic: { clinicId: string; slug: string; status: string } }).clinic;
    expect(typeof clinic.clinicId).toBe("string");
    expect(clinic.slug).toBe("sunrise-clinic");
    expect(clinic.status).toBe("active");
  });

  it("returns 400 when name is missing", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "POST", "/api/v1/clinics", { ...VALID_BODY, name: "" }, a.token);
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("CLINIC_INVALID_INPUT");
  });

  it("returns 400 when email is invalid", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "POST", "/api/v1/clinics", { ...VALID_BODY, email: "not-an-email" }, a.token);
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("email");
  });

  it("returns 400 when address is missing", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(app, "POST", "/api/v1/clinics", { ...VALID_BODY, address: "" }, a.token);
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("address");
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "POST", "/api/v1/clinics", VALID_BODY);
    expect(status).toBe(401);
  });

  it("auto-increments slug when a clinic with the same name already exists", async () => {
    const { a } = buildTwoClinicFixture();
    await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const { body } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const clinic = (body as { clinic: { slug: string } }).clinic;
    expect(clinic.slug).toBe("sunrise-clinic-2");
  });
});

describe("GET /api/v1/clinics/:clinicId — read", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    clinicStore._reset();
  });

  it("returns 200 with the clinic for the owner's own clinicId", async () => {
    const { a } = buildTwoClinicFixture();
    const { body: created } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const clinicId = (created as { clinic: { clinicId: string } }).clinic.clinicId;

    const { status, body } = await req(app, "GET", `/api/v1/clinics/${clinicId}`, undefined, a.token);
    expect(status).toBe(200);
    expect((body as { clinic: { clinicId: string } }).clinic.clinicId).toBe(clinicId);
  });

  it("returns 403 when a different clinic's token is used (requireClinicScope fires before repo)", async () => {
    const { a, b } = buildTwoClinicFixture();
    const { body: created } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const clinicId = (created as { clinic: { clinicId: string } }).clinic.clinicId;

    const { status } = await req(app, "GET", `/api/v1/clinics/${clinicId}`, undefined, b.token);
    expect(status).toBe(403);
  });
});

describe("PATCH /api/v1/clinics/:clinicId — update", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    clinicStore._reset();
  });

  it("returns 200 with updated fields", async () => {
    const { a } = buildTwoClinicFixture();
    const { body: created } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const clinicId = (created as { clinic: { clinicId: string } }).clinic.clinicId;

    const { status, body } = await req(app, "PATCH", `/api/v1/clinics/${clinicId}`, { name: "Dusk Clinic" }, a.token);
    expect(status).toBe(200);
    expect((body as { clinic: { name: string } }).clinic.name).toBe("Dusk Clinic");
  });

  it("returns 400 on invalid email in patch body", async () => {
    const { a } = buildTwoClinicFixture();
    const { body: created } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const clinicId = (created as { clinic: { clinicId: string } }).clinic.clinicId;

    const { status } = await req(app, "PATCH", `/api/v1/clinics/${clinicId}`, { email: "bad" }, a.token);
    expect(status).toBe(400);
  });

  it("returns 403 when a clinician tries to update the clinic", async () => {
    const { a } = buildTwoClinicFixture();
    const { body: created } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const clinicId = (created as { clinic: { clinicId: string } }).clinic.clinicId;

    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status, body } = await req(app, "PATCH", `/api/v1/clinics/${clinicId}`, { name: "Hacked" }, clinicianToken);
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("AUTH_FORBIDDEN");
  });
});

describe("DELETE /api/v1/clinics/:clinicId — archive", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    clinicStore._reset();
  });

  it("returns 200 and the clinic status becomes archived", async () => {
    const { a } = buildTwoClinicFixture();
    const { body: created } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const clinicId = (created as { clinic: { clinicId: string } }).clinic.clinicId;

    const { status, body } = await req(app, "DELETE", `/api/v1/clinics/${clinicId}`, undefined, a.token);
    expect(status).toBe(200);
    expect((body as { ok: boolean }).ok).toBe(true);

    const stored = clinicStore.findById(clinicId);
    expect(stored?.status).toBe("archived");
  });

  it("returns 403 when an admin tries to archive the clinic — only owner may", async () => {
    const { a } = buildTwoClinicFixture();
    const { body: created } = await req(app, "POST", "/api/v1/clinics", VALID_BODY, a.token);
    const clinicId = (created as { clinic: { clinicId: string } }).clinic.clinicId;

    const adminToken = tokenWithRole(a.clinicId, "admin");
    const { status, body } = await req(app, "DELETE", `/api/v1/clinics/${clinicId}`, undefined, adminToken);
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("AUTH_FORBIDDEN");
  });
});
