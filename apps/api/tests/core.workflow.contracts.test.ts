import { describe, expect, it } from "vitest";
import { loginSchema } from "../src/modules/auth/auth.validation";
import { createEncounterSchema } from "../src/modules/encounters/encounters.validation";
import { createPatientSchema } from "../src/modules/patients/patients.validation";
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
    const result = createPatientSchema.safeParse({
      firstName: "Amina",
      lastName: "Kato",
      dateOfBirth: "1994-01-03T00:00:00.000Z",
      sex: "F",
      contactNumber: "+256700000000",
      address: "Kampala",
    });

    expect(result.success).toBe(true);
  });

  it("accepts encounter creation with and without a patient id", () => {
    expect(createEncounterSchema.safeParse({}).success).toBe(true);
    expect(
      createEncounterSchema.safeParse({ patientId: "507f1f77bcf86cd799439011" }).success,
    ).toBe(true);
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
