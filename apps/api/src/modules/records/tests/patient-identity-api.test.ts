import { describe, it, expect, beforeEach } from "vitest";
import type { Express } from "express";
import { app } from "../../app.js";
import { identityStore } from "../../modules/auth/repositories/identity.repository.js";
import { sessionStore } from "../../modules/auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../modules/auth/controllers/auth.controller.js";
import { clinicStore } from "../../modules/clinic/repositories/clinic.repository.js";
import { patientIdentityStore } from "../repositories/in-memory-patient-identity.repository.js";

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
  clinicStore._reset();
  patientIdentityStore._reset();
}

describe("E2E: patient identity CRUD", () => {
  beforeEach(resetAll);

  async function registerOwner() {
    const reg = await request(app, "POST", "/api/v1/auth/register", {
      email: "identity-owner@test.com",
      password: "OwnerPass1!",
      clinicName: "Identity Clinic",
    });
    expect(reg.status).toBe(201);
    return {
      token: (reg.body.session as Body).accessToken as string,
      clinicId: (reg.body.session as Body).clinicId as string,
    };
  }

  it("returns 404 when identity does not exist", async () => {
    const { token } = await registerOwner();
    const res = await request(app, "GET", "/api/v1/patients/p_nonexistent/identity", undefined, token);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("creates identity via PATCH and retrieves it via GET", async () => {
    const { token } = await registerOwner();

    const patch = await request(
      app,
      "PATCH",
      "/api/v1/patients/p_100/identity",
      {
        firstName: "Maria",
        lastName: "Lopez",
        dateOfBirth: "1992-07-21",
        gender: "female",
        mrn: "MRN-10001",
        phone: "+1-555-0200",
        email: "maria.lopez@test.com",
        address: "456 Clinic Rd",
      },
      token,
    );
    expect(patch.status).toBe(200);
    expect(patch.body.success).toBe(true);
    const identity = patch.body.identity as Body;
    expect(identity.firstName).toBe("Maria");
    expect(identity.lastName).toBe("Lopez");

    const get = await request(app, "GET", "/api/v1/patients/p_100/identity", undefined, token);
    expect(get.status).toBe(200);
    expect(get.body.success).toBe(true);
    expect((get.body.identity as Body).mrn).toBe("MRN-10001");
  });

  it("updates identity fields via PATCH", async () => {
    const { token } = await registerOwner();

    await request(
      app,
      "PATCH",
      "/api/v1/patients/p_101/identity",
      {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1985-01-01",
        gender: "male",
        mrn: "MRN-10101",
        phone: "+1-555-0300",
        email: "john.doe@test.com",
        address: "789 Health Blvd",
      },
      token,
    );

    const update = await request(
      app,
      "PATCH",
      "/api/v1/patients/p_101/identity",
      {
        firstName: "Johnny",
        lastName: "Doe",
        dateOfBirth: "1985-01-01",
        gender: "male",
        mrn: "MRN-10101",
        phone: "+1-555-0399",
        email: "johnny.doe@test.com",
        address: "789 Health Blvd",
      },
      token,
    );
    expect(update.status).toBe(200);
    expect((update.body.identity as Body).firstName).toBe("Johnny");
    expect((update.body.identity as Body).email).toBe("johnny.doe@test.com");
  });

  it("rejects invalid input on PATCH", async () => {
    const { token } = await registerOwner();

    const res = await request(
      app,
      "PATCH",
      "/api/v1/patients/p_102/identity",
      {
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "invalid_gender",
        mrn: "",
        phone: "",
        email: "not-an-email",
        address: "",
      },
      token,
    );
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app, "GET", "/api/v1/patients/p_103/identity");
    expect(res.status).toBe(401);
  });
});
