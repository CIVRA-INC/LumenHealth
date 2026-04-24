import { describe, expect, it } from "vitest";
import { loginSchema } from "../src/modules/auth/auth.validation";
import { createEncounterSchema } from "../src/modules/encounters/encounters.validation";
import { createPatientSchema } from "../src/modules/patients/patients.validation";
import {
  makeEncounterFixture,
  makePatientFixture,
  makeStaffFixture,
} from "./fixtures";
import {
  queueStreamQuerySchema,
  routeQueueEncounterBodySchema,
  routeQueueEncounterParamsSchema,
} from "../src/modules/queue/queue.validation";

describe("core workflow request contracts", () => {
  it("accepts valid clinic login credentials", () => {
    const result = loginSchema.safeParse({
      email: "admin@clinic.org",
      password: "Password123",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid patient registration payload", () => {
    const patient = makePatientFixture();
    const result = createPatientSchema.safeParse({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex,
      contactNumber: patient.contactNumber,
      address: patient.address,
    });

    expect(result.success).toBe(true);
  });

  it("accepts encounter creation with and without a patient id", () => {
    const encounter = makeEncounterFixture();
    const provider = makeStaffFixture();

    expect(createEncounterSchema.safeParse({}).success).toBe(true);
    expect(createEncounterSchema.safeParse({ patientId: encounter.patientId }).success).toBe(true);
    expect(provider.role).toBe("PROVIDER");
  });

  it("accepts valid queue routing and streaming inputs", () => {
    expect(
      routeQueueEncounterParamsSchema.safeParse({
        id: "507f1f77bcf86cd799439011",
      }).success,
    ).toBe(true);
    expect(routeQueueEncounterBodySchema.safeParse({ queueStatus: "TRIAGE" }).success).toBe(true);
    expect(queueStreamQuerySchema.safeParse({ token: "signed-access-token" }).success).toBe(true);
  });
});
