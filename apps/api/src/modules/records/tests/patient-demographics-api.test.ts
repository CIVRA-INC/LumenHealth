import { describe, it, expect, beforeEach } from "vitest";
import type { Express } from "express";
import { app } from "../../../app.js";
import { identityStore } from "../../../modules/auth/repositories/identity.repository.js";
import { sessionStore } from "../../../modules/auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../../modules/auth/controllers/auth.controller.js";
import { patientStore } from "../repositories/in-memory-patient.repository.js";

type Body = Record<string, unknown>;

function resetAll() {
  _resetAuthStateForTests();
  identityStore._reset();
  sessionStore._reset();
  patientStore._reset();
}

async function request(
  application: Express,
  method: "GET" | "POST" | "PATCH",
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

async function registerAndLogin(): Promise<{ token: string; clinicId: string }> {
  const reg = await request(app, "POST", "/api/v1/auth/register", {
    email: `test-${Date.now()}@clinic.test`,
    password: "Passw0rd!",
    clinicName: "Test Clinic",
  });
  const session = reg.body.session as { accessToken: string; clinicId: string };
  return { token: session.accessToken, clinicId: session.clinicId };
}

describe("Patient Demographics API Contract", () => {
  beforeEach(resetAll);

  describe("POST /api/v1/patients — create patient", () => {
    it("returns 201 with created patient demographics", async () => {
      const { token } = await registerAndLogin();
      const { status, body } = await request(app, "POST", "/api/v1/patients", {
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        gender: "female",
        bloodType: "O+",
        emergencyContact: {
          name: "John Doe",
          relationship: "spouse",
          phoneNumber: "+1-555-0101",
        },
      }, token);

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      const data = body.data as Body;
      expect(typeof data.patientId).toBe("string");
      expect(data.firstName).toBe("Jane");
      expect(data.lastName).toBe("Doe");
      expect(data.gender).toBe("female");
    });

    it("returns 401 without auth token", async () => {
      const { status } = await request(app, "POST", "/api/v1/patients", {
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        gender: "female",
        emergencyContact: { name: "John", relationship: "spouse", phoneNumber: "+1-555-0101" },
      });
      expect(status).toBe(401);
    });

    it("returns 400 with invalid input", async () => {
      const { token } = await registerAndLogin();
      const { status, body } = await request(app, "POST", "/api/v1/patients", {
        firstName: "",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        gender: "female",
        emergencyContact: { name: "John", relationship: "spouse", phoneNumber: "+1-555-0101" },
      }, token);
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe("GET /api/v1/patients — list patients for clinic", () => {
    it("returns patients belonging to the authenticated clinic", async () => {
      const { token } = await registerAndLogin();
      await request(app, "POST", "/api/v1/patients", {
        firstName: "Alice",
        lastName: "Smith",
        dateOfBirth: "1985-03-20",
        gender: "female",
        emergencyContact: { name: "Bob", relationship: "brother", phoneNumber: "+1-555-0202" },
      }, token);
      await request(app, "POST", "/api/v1/patients", {
        firstName: "Charlie",
        lastName: "Brown",
        dateOfBirth: "1978-11-10",
        gender: "male",
        emergencyContact: { name: "Lucy", relationship: "friend", phoneNumber: "+1-555-0303" },
      }, token);

      const { status, body } = await request(app, "GET", "/api/v1/patients", undefined, token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      const data = body.data as { patients: Body[]; totalCount: number };
      expect(data.totalCount).toBe(2);
      expect(data.patients).toHaveLength(2);
    });

    it("returns 401 without auth token", async () => {
      const { status } = await request(app, "GET", "/api/v1/patients");
      expect(status).toBe(401);
    });
  });

  describe("GET /api/v1/patients/:patientId/demographics — get demographics", () => {
    it("returns demographics envelope for an existing patient", async () => {
      const { token } = await registerAndLogin();
      const createRes = await request(app, "POST", "/api/v1/patients", {
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        gender: "female",
        bloodType: "A-",
        emergencyContact: { name: "John", relationship: "spouse", phoneNumber: "+1-555-0101" },
      }, token);
      const patientId = (createRes.body.data as Body).patientId as string;

      const { status, body } = await request(app, "GET", `/api/v1/patients/${patientId}/demographics`, undefined, token);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      const data = body.data as Body;
      expect(data.patientId).toBe(patientId);
      expect(data.firstName).toBe("Jane");
      expect(data.bloodType).toBe("A-");
    });

    it("returns 404 for a non-existent patient", async () => {
      const { token } = await registerAndLogin();
      const { status, body } = await request(app, "GET", "/api/v1/patients/non-existent-id/demographics", undefined, token);
      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });

    it("returns 401 without auth token", async () => {
      const { status } = await request(app, "GET", "/api/v1/patients/any-id/demographics");
      expect(status).toBe(401);
    });
  });

  describe("PATCH /api/v1/patients/:patientId/demographics — update demographics", () => {
    it("updates demographics and returns updated record", async () => {
      const { token } = await registerAndLogin();
      const createRes = await request(app, "POST", "/api/v1/patients", {
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        gender: "female",
        emergencyContact: { name: "John", relationship: "spouse", phoneNumber: "+1-555-0101" },
      }, token);
      const patientId = (createRes.body.data as Body).patientId as string;

      const { status, body } = await request(app, "PATCH", `/api/v1/patients/${patientId}/demographics`, {
        firstName: "Janet",
        bloodType: "B+",
      }, token);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      const data = body.data as Body;
      expect(data.firstName).toBe("Janet");
      expect(data.bloodType).toBe("B+");
      expect(data.lastName).toBe("Doe");
    });

    it("returns 404 for a non-existent patient", async () => {
      const { token } = await registerAndLogin();
      const { status, body } = await request(app, "PATCH", "/api/v1/patients/non-existent-id/demographics", {
        firstName: "Updated",
      }, token);
      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });
});
