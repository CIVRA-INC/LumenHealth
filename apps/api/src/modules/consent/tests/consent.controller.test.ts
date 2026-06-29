import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Express } from "express";
import type { UserRole } from "@lumen/types";
import { consentRouter } from "../routes/index.js";
import { _reset } from "../repositories/consent.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { patientStore } from "../../patient/repositories/patient.repository.js";
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
  app.use("/api/v1/patients/:patientId/consent", consentRouter);
  return app;
}

async function req(
  app: Express,
  method: "GET" | "POST" | "DELETE",
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
  type: "data_processing",
  scope: ["treatment", "billing"],
};

describe("POST /api/v1/patients/:patientId/consent — grant", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    patientStore._reset();
    _reset();
  });

  it("returns 201 with the created consent for an owner", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(
      app,
      "POST",
      `/api/v1/patients/${a.patientId}/consent`,
      VALID_BODY,
      a.token,
    );
    expect(status).toBe(201);
    const consent = (
      body as { consent: { id: string; status: string; type: string } }
    ).consent;
    expect(typeof consent.id).toBe("string");
    expect(consent.status).toBe("active");
    expect(consent.type).toBe("data_processing");
  });

  it("returns 400 with field context on invalid type", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(
      app,
      "POST",
      `/api/v1/patients/${a.patientId}/consent`,
      { type: "unknown", scope: ["x"] },
      a.token,
    );
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("type");
  });

  it("returns 400 on missing scope", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(
      app,
      "POST",
      `/api/v1/patients/${a.patientId}/consent`,
      { type: "research" },
      a.token,
    );
    expect(status).toBe(400);
    expect((body as { field: string }).field).toBe("scope");
  });

  it("returns 403 when a cashier tries to grant consent", async () => {
    const { a } = buildTwoClinicFixture();
    const cashierToken = tokenWithRole(a.clinicId, "cashier");
    const { status, body } = await req(
      app,
      "POST",
      `/api/v1/patients/${a.patientId}/consent`,
      VALID_BODY,
      cashierToken,
    );
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("AUTH_FORBIDDEN");
  });

  it("returns 201 for a clinician (patient:write)", async () => {
    const { a } = buildTwoClinicFixture();
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(
      app,
      "POST",
      `/api/v1/patients/${a.patientId}/consent`,
      VALID_BODY,
      clinicianToken,
    );
    expect(status).toBe(201);
  });

  it("returns 401 with no token", async () => {
    const { a } = buildTwoClinicFixture();
    const { status } = await req(
      app,
      "POST",
      `/api/v1/patients/${a.patientId}/consent`,
      VALID_BODY,
    );
    expect(status).toBe(401);
  });
});

describe("GET /api/v1/patients/:patientId/consent — list", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    patientStore._reset();
    _reset();
  });

  it("returns 200 with empty array when no consents exist", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(
      app,
      "GET",
      `/api/v1/patients/${a.patientId}/consent`,
      undefined,
      a.token,
    );
    expect(status).toBe(200);
    expect((body as { consents: unknown[] }).consents).toEqual([]);
  });

  it("returns 200 with granted consents", async () => {
    const { a } = buildTwoClinicFixture();
    await req(
      app,
      "POST",
      `/api/v1/patients/${a.patientId}/consent`,
      VALID_BODY,
      a.token,
    );
    const { status, body } = await req(
      app,
      "GET",
      `/api/v1/patients/${a.patientId}/consent`,
      undefined,
      a.token,
    );
    expect(status).toBe(200);
    expect(
      (body as { consents: { type: string }[] }).consents,
    ).toHaveLength(1);
  });

  it("returns 403 for a cashier (no patient:read)", async () => {
    const { a } = buildTwoClinicFixture();
    const cashierToken = tokenWithRole(a.clinicId, "cashier");
    const { status } = await req(
      app,
      "GET",
      `/api/v1/patients/${a.patientId}/consent`,
      undefined,
      cashierToken,
    );
    expect(status).toBe(403);
  });
});

describe("DELETE /api/v1/patients/:patientId/consent/:consentId — revoke", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    patientStore._reset();
    _reset();
  });

  it("returns 200 with the revoked consent", async () => {
    const { a } = buildTwoClinicFixture();
    const created = await req(
      app,
      "POST",
      `/api/v1/patients/${a.patientId}/consent`,
      VALID_BODY,
      a.token,
    );
    const consentId = (
      created.body as { consent: { id: string } }
    ).consent.id;
    const { status, body } = await req(
      app,
      "DELETE",
      `/api/v1/patients/${a.patientId}/consent/${consentId}`,
      undefined,
      a.token,
    );
    expect(status).toBe(200);
    expect(
      (body as { consent: { status: string } }).consent.status,
    ).toBe("revoked");
    expect(
      typeof (body as { consent: { revokedAt: string } }).consent.revokedAt,
    ).toBe("string");
  });

  it("returns 404 for a non-existing consent", async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await req(
      app,
      "DELETE",
      `/api/v1/patients/${a.patientId}/consent/does-not-exist`,
      undefined,
      a.token,
    );
    expect(status).toBe(404);
    expect((body as { error: string }).error).toBe("CONSENT_NOT_FOUND");
  });

  it("returns 403 for a cashier", async () => {
    const { a } = buildTwoClinicFixture();
    const cashierToken = tokenWithRole(a.clinicId, "cashier");
    const { status } = await req(
      app,
      "DELETE",
      `/api/v1/patients/${a.patientId}/consent/nonexistent`,
      undefined,
      cashierToken,
    );
    expect(status).toBe(403);
  });
});
