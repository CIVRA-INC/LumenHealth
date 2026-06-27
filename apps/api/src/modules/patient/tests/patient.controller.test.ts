import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Express } from "express";
import type { UserRole } from "@lumen/types";
import { patientRouter } from "../routes/index.js";
import { patientStore } from "../repositories/patient.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";

function tokenWithRole(clinicId: string, role: UserRole): string {
  return accessTokenSigner.sign({
    sub: `user-${role}-${clinicId}`,
    clinicId,
    role,
  });
}

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/patients", patientRouter);
  return app;
}

async function req(
  app: Express,
  method: "GET" | "POST" | "PATCH" | "DELETE",
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
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

const VALID_BODY = {
  identifier: "MRN-001",
  givenName: "Ada",
  familyName: "Lovelace",
  birthDate: "1815-12-10",
  phone: "+441234567890",
  email: "ada@example.com",
  address: "1 Science Park",
};

describe("POST /api/v1/patients — create", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    patientStore._reset();
  });

  it("returns 201 with the created patient for an owner", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    expect(status).toBe(201);
    const patient = (
      body as { patient: { patientId: string; status: string } }
    ).patient;
    expect(typeof patient.patientId).toBe("string");
    expect(patient.status).toBe("active");
  });

  it("returns 409 with PATIENT_IDENTIFIER_TAKEN on duplicate MRN in same clinic", async () => {
    const { a } = buildTwoClinicFixture();
    await req(app, "POST", "/api/v1/patients", VALID_BODY, a.token);
    const { status, body } = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    expect(status).toBe(409);
    expect((body as { error: string }).error).toBe("PATIENT_IDENTIFIER_TAKEN");
  });

  it("returns 400 with field context on invalid email", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(
      app,
      "POST",
      "/api/v1/patients",
      { ...VALID_BODY, email: "not-an-email" },
      a.token,
    );
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("email");
  });

  it("returns 400 with field context on missing birthDate", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(
      app,
      "POST",
      "/api/v1/patients",
      { ...VALID_BODY, birthDate: "12/10/1815" },
      a.token,
    );
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("birthDate");
  });

  it("returns 403 when a cashier tries to create", async () => {
    const { a } = buildTwoClinicFixture();
    const cashierToken = tokenWithRole(a.clinicId, "cashier");
    const { status, body } = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      cashierToken,
    );
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("AUTH_FORBIDDEN");
  });

  it("returns 200 for a clinician (front-desk write path)", async () => {
    const { a } = buildTwoClinicFixture();
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      clinicianToken,
    );
    expect(status).toBe(201);
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "POST", "/api/v1/patients", VALID_BODY);
    expect(status).toBe(401);
  });
});

describe("GET /api/v1/patients — list", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    patientStore._reset();
  });

  it("returns 200 with paginated patients scoped to caller's clinic", async () => {
    const { a } = buildTwoClinicFixture();
    await req(app, "POST", "/api/v1/patients", VALID_BODY, a.token);
    await req(
      app,
      "POST",
      "/api/v1/patients",
      { ...VALID_BODY, identifier: "MRN-2" },
      a.token,
    );
    const { status, body } = await req(
      app,
      "GET",
      "/api/v1/patients?limit=10",
      undefined,
      a.token,
    );
    expect(status).toBe(200);
    const page = body as { items: unknown[]; total: number };
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(2);
  });

  it("returns sanitized PatientListItem shape (no PII)", async () => {
    const { a } = buildTwoClinicFixture();
    await req(app, "POST", "/api/v1/patients", VALID_BODY, a.token);
    const { body } = await req(
      app,
      "GET",
      "/api/v1/patients",
      undefined,
      a.token,
    );
    const item = (body as { items: Record<string, unknown>[] }).items[0];
    const allowed = [
      "clinicId",
      "familyName",
      "givenName",
      "identifier",
      "patientId",
      "status",
    ];
    expect(Object.keys(item).sort()).toEqual([...allowed].sort());
  });

  it("returns 403 for a cashier (no patient:read permission)", async () => {
    const { a } = buildTwoClinicFixture();
    const cashierToken = tokenWithRole(a.clinicId, "cashier");
    const { status, body } = await req(
      app,
      "GET",
      "/api/v1/patients",
      undefined,
      cashierToken,
    );
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("AUTH_FORBIDDEN");
  });

  it("returns 200 for a clinician", async () => {
    const { a } = buildTwoClinicFixture();
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(
      app,
      "GET",
      "/api/v1/patients",
      undefined,
      clinicianToken,
    );
    expect(status).toBe(200);
  });
});

describe("GET /api/v1/patients/:patientId — read", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    patientStore._reset();
  });

  it("returns 200 with the patient when caller clinic matches", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const { status, body } = await req(
      app,
      "GET",
      `/api/v1/patients/${patientId}`,
      undefined,
      a.token,
    );
    expect(status).toBe(200);
    expect(
      (body as { patient: { patientId: string } }).patient.patientId,
    ).toBe(patientId);
  });

  it("returns 404 for a cross-clinic patient (avoids existence enumeration)", async () => {
    const { a, b } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      b.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const { status } = await req(
      app,
      "GET",
      `/api/v1/patients/${patientId}`,
      undefined,
      a.token,
    );
    expect(status).toBe(404);
  });

  it("returns 404 for an unknown patientId", async () => {
    const { a } = buildTwoClinicFixture();
    const { status } = await req(
      app,
      "GET",
      "/api/v1/patients/does-not-exist",
      undefined,
      a.token,
    );
    expect(status).toBe(404);
  });

  it("returns 200 for a clinician (read allowed)", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(
      app,
      "GET",
      `/api/v1/patients/${patientId}`,
      undefined,
      clinicianToken,
    );
    expect(status).toBe(200);
  });
});

describe("PATCH /api/v1/patients/:patientId — update", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    patientStore._reset();
  });

  it("returns 200 with the patched patient", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const { status, body } = await req(
      app,
      "PATCH",
      `/api/v1/patients/${patientId}`,
      { givenName: "Augusta" },
      a.token,
    );
    expect(status).toBe(200);
    expect(
      (body as { patient: { givenName: string } }).patient.givenName,
    ).toBe("Augusta");
  });

  it("returns 404 for cross-clinic update attempt", async () => {
    const { a, b } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      b.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const { status } = await req(
      app,
      "PATCH",
      `/api/v1/patients/${patientId}`,
      { givenName: "Augusta" },
      a.token,
    );
    expect(status).toBe(404);
  });

  it("returns 400 with field context on invalid update body", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const { status } = await req(
      app,
      "PATCH",
      `/api/v1/patients/${patientId}`,
      { email: "bad" },
      a.token,
    );
    expect(status).toBe(400);
  });

  it("returns 403 for a cashier (no patient:write permission)", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const cashierToken = tokenWithRole(a.clinicId, "cashier");
    const { status } = await req(
      app,
      "PATCH",
      `/api/v1/patients/${patientId}`,
      { givenName: "X" },
      cashierToken,
    );
    expect(status).toBe(403);
  });

  it("returns 200 for a clinician update", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(
      app,
      "PATCH",
      `/api/v1/patients/${patientId}`,
      { givenName: "Augusta" },
      clinicianToken,
    );
    expect(status).toBe(200);
  });
});

describe("DELETE /api/v1/patients/:patientId — archive", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    patientStore._reset();
  });

  it("returns 200 with the archived patient for admin", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const adminToken = tokenWithRole(a.clinicId, "admin");
    const { status, body } = await req(
      app,
      "DELETE",
      `/api/v1/patients/${patientId}`,
      undefined,
      adminToken,
    );
    expect(status).toBe(200);
    expect(
      (body as { patient: { status: string } }).patient.status,
    ).toBe("archived");
  });

  it("returns 403 for a clinician (only owner or admin may archive)", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status, body } = await req(
      app,
      "DELETE",
      `/api/v1/patients/${patientId}`,
      undefined,
      clinicianToken,
    );
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("AUTH_FORBIDDEN");
  });

  it("returns 403 for a cashier (route-level permission)", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      a.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const cashierToken = tokenWithRole(a.clinicId, "cashier");
    const { status } = await req(
      app,
      "DELETE",
      `/api/v1/patients/${patientId}`,
      undefined,
      cashierToken,
    );
    expect(status).toBe(403);
  });

  it("returns 404 for cross-clinic archive attempt", async () => {
    const { a, b } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      "/api/v1/patients",
      VALID_BODY,
      b.token,
    );
    const patientId = (
      created.body as { patient: { patientId: string } }
    ).patient.patientId;
    const { status } = await req(
      app,
      "DELETE",
      `/api/v1/patients/${patientId}`,
      undefined,
      a.token,
    );
    expect(status).toBe(404);
  });
});
