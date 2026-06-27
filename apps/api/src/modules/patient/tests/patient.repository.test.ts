import { describe, it, expect, beforeEach } from "vitest";
import type { Patient, PatientStatus } from "@lumen/types";
import { patientStore } from "../repositories/patient.repository.js";
import {
  validateCreatePatient,
  validateUpdatePatient,
} from "../validators/patient.validator.js";

function makePatient(overrides: Partial<Patient> = {}): Patient {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    patientId: overrides.patientId ?? "pat_test_1",
    clinicId: overrides.clinicId ?? "clinic_a",
    identifier: overrides.identifier ?? "MRN-001",
    givenName: overrides.givenName ?? "Ada",
    familyName: overrides.familyName ?? "Lovelace",
    birthDate: overrides.birthDate ?? "1815-12-10",
    phone: overrides.phone ?? "+441234567890",
    email: overrides.email ?? "ada@example.com",
    address: overrides.address ?? "1 Science Park",
    status: overrides.status ?? ("active" as PatientStatus),
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe("patientStore", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("saves and retrieves a patient by id", () => {
    patientStore.save(makePatient({ patientId: "pat_1" }));
    expect(patientStore.findById("pat_1")?.identifier).toBe("MRN-001");
  });

  it("returns undefined for an unknown id", () => {
    expect(patientStore.findById("missing")).toBeUndefined();
  });

  it("finds by (clinicId, identifier) case-insensitively", () => {
    patientStore.save(makePatient({ patientId: "pat_1", identifier: "MRN-001" }));
    patientStore.save(
      makePatient({ patientId: "pat_2", clinicId: "clinic_b", identifier: "mrn-001" }),
    );
    expect(patientStore.findByIdentifier("clinic_a", "MRN-001")?.patientId).toBe("pat_1");
    expect(patientStore.findByIdentifier("clinic_a", "mrn-001")?.patientId).toBe("pat_1");
    expect(patientStore.findByIdentifier("clinic_b", "MRN-001")?.patientId).toBe("pat_2");
  });

  it("distinguishes the same identifier across different clinics", () => {
    patientStore.save(makePatient({ patientId: "p1", clinicId: "a", identifier: "X" }));
    patientStore.save(makePatient({ patientId: "p2", clinicId: "b", identifier: "X" }));
    expect(patientStore.findByIdentifier("a", "X")?.patientId).toBe("p1");
    expect(patientStore.findByIdentifier("b", "X")?.patientId).toBe("p2");
  });

  it("lists with optional clinicId and status filters", () => {
    patientStore.save(makePatient({ patientId: "p1", clinicId: "a", status: "active" }));
    patientStore.save(makePatient({ patientId: "p2", clinicId: "a", status: "inactive" }));
    patientStore.save(makePatient({ patientId: "p3", clinicId: "b", status: "active" }));

    expect(patientStore.list()).toHaveLength(3);
    expect(patientStore.list({ clinicId: "a" })).toHaveLength(2);
    expect(patientStore.list({ clinicId: "a", status: "active" })).toHaveLength(1);
    expect(patientStore.list({ status: "active" })).toHaveLength(2);
  });

  it("_reset clears the store and the identifier index", () => {
    patientStore.save(makePatient({ identifier: "MRN-001" }));
    patientStore._reset();
    expect(patientStore.list()).toHaveLength(0);
    expect(patientStore.findByIdentifier("clinic_a", "MRN-001")).toBeUndefined();
  });
});

const VALID = {
  identifier: "MRN-001",
  givenName: "Ada",
  familyName: "Lovelace",
  birthDate: "1815-12-10",
  phone: "+441234567890",
  email: "ada@example.com",
  address: "1 Science Park",
};

describe("validateCreatePatient", () => {
  it("accepts a well-formed body", () => {
    expect(validateCreatePatient(VALID).ok).toBe(true);
  });

  it("rejects a malformed birthDate", () => {
    const result = validateCreatePatient({ ...VALID, birthDate: "12/10/1815" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("birthDate");
  });

  it("rejects a malformed email", () => {
    const result = validateCreatePatient({ ...VALID, email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("email");
  });

  it("rejects an empty required string field", () => {
    const result = validateCreatePatient({ ...VALID, givenName: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("givenName");
  });

  it("rejects a phone outside the min/max length", () => {
    expect(validateCreatePatient({ ...VALID, phone: "12" }).ok).toBe(false);
    expect(
      validateCreatePatient({ ...VALID, phone: "1".repeat(40) }).ok,
    ).toBe(false);
  });

  it("rejects givenName longer than 120 characters", () => {
    const result = validateCreatePatient({
      ...VALID,
      givenName: "a".repeat(121),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("givenName");
  });

  it("rejects familyName longer than 120 characters", () => {
    const result = validateCreatePatient({
      ...VALID,
      familyName: "a".repeat(121),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("familyName");
  });

  it("accepts givenName of exactly 120 characters", () => {
    const result = validateCreatePatient({
      ...VALID,
      givenName: "a".repeat(120),
    });
    expect(result.ok).toBe(true);
  });

  it("accepts identifier of up to 240 characters", () => {
    const result = validateCreatePatient({
      ...VALID,
      identifier: "I".repeat(240),
    });
    expect(result.ok).toBe(true);
  });
});

describe("validateUpdatePatient", () => {
  it("accepts a partial body with only allowed fields", () => {
    expect(validateUpdatePatient({ givenName: "Augusta" }).ok).toBe(true);
  });

  it("accepts an empty body", () => {
    expect(validateUpdatePatient({}).ok).toBe(true);
  });

  it("rejects unknown fields", () => {
    const result = validateUpdatePatient({ notAField: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("notAField");
  });

  it("rejects an unrecognized status", () => {
    const result = validateUpdatePatient({ status: "deleted" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("status");
  });

  it("rejects empty-string optional fields", () => {
    expect(validateUpdatePatient({ phone: "" }).ok).toBe(false);
    expect(validateUpdatePatient({ address: "" }).ok).toBe(false);
  });
});
