import { describe, it, expect, beforeEach } from "vitest";
import { patientStore } from "../repositories/in-memory-patient.repository.js";
import {
  createPatient,
  getPatient,
  updateDemographics,
  listPatients,
} from "../services/patient-demographics.service.js";

const CLINIC_A = "clinic-a";
const CLINIC_B = "clinic-b";

function makePatientInput(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-05-12",
    gender: "female",
    bloodType: "O+",
    emergencyContact: {
      name: "John Doe",
      relationship: "spouse",
      phoneNumber: "555-0100",
    },
    ...overrides,
  };
}

describe("Patient Demographics Service", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  describe("createPatient", () => {
    it("creates a patient with a generated ID and timestamps", () => {
      const patient = createPatient(CLINIC_A, makePatientInput());

      expect(patient.patientId).toBeTruthy();
      expect(patient.clinicId).toBe(CLINIC_A);
      expect(patient.firstName).toBe("Jane");
      expect(patient.lastName).toBe("Doe");
      expect(patient.createdAt).toBeTruthy();
      expect(patient.updatedAt).toBe(patient.createdAt);
    });

    it("rejects missing required fields", () => {
      expect(() =>
        createPatient(CLINIC_A, { firstName: "", lastName: "Doe", dateOfBirth: "1990-01-01", gender: "female", emergencyContact: { name: "X", relationship: "parent", phoneNumber: "555-0000" } }),
      ).toThrow();
    });

    it("rejects invalid gender values", () => {
      expect(() =>
        createPatient(CLINIC_A, makePatientInput({ gender: "invalid" })),
      ).toThrow();
    });
  });

  describe("getPatient", () => {
    it("retrieves a patient by ID within the same clinic", () => {
      const created = createPatient(CLINIC_A, makePatientInput());
      const found = getPatient(created.patientId, CLINIC_A);

      expect(found).not.toBeNull();
      expect(found!.patientId).toBe(created.patientId);
    });

    it("returns null when patient is not found", () => {
      const found = getPatient("non-existent", CLINIC_A);
      expect(found).toBeNull();
    });
  });

  describe("clinic isolation", () => {
    it("does not expose a patient from clinic A to clinic B", () => {
      const created = createPatient(CLINIC_A, makePatientInput());
      const found = getPatient(created.patientId, CLINIC_B);

      expect(found).toBeNull();
    });

    it("listPatients only returns patients belonging to the caller's clinic", () => {
      createPatient(CLINIC_A, makePatientInput({ firstName: "Alice" }));
      createPatient(CLINIC_B, makePatientInput({ firstName: "Bob" }));
      createPatient(CLINIC_A, makePatientInput({ firstName: "Carol" }));

      const clinicAPatients = listPatients(CLINIC_A);
      const clinicBPatients = listPatients(CLINIC_B);

      expect(clinicAPatients).toHaveLength(2);
      expect(clinicBPatients).toHaveLength(1);
      expect(clinicBPatients[0]!.firstName).toBe("Bob");
    });
  });

  describe("updateDemographics", () => {
    it("updates demographics fields and bumps updatedAt", async () => {
      const created = createPatient(CLINIC_A, makePatientInput());

      // Small delay so updatedAt differs
      await new Promise((r) => setTimeout(r, 10));

      const updated = updateDemographics(
        created.patientId,
        CLINIC_A,
        { firstName: "Janet", gender: "non_binary" },
      );

      expect(updated).not.toBeNull();
      expect(updated!.firstName).toBe("Janet");
      expect(updated!.gender).toBe("non_binary");
      expect(updated!.lastName).toBe("Doe");
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(created.updatedAt).getTime(),
      );
    });

    it("returns null when updating a patient in a different clinic", () => {
      const created = createPatient(CLINIC_A, makePatientInput());
      const updated = updateDemographics(
        created.patientId,
        CLINIC_B,
        { firstName: "Hacked" },
      );

      expect(updated).toBeNull();
    });
  });
});
