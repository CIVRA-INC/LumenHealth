import { describe, expect, it } from "vitest";
import { makeEncounterFixture, makePatientFixture, syntheticDataGuidelines } from "./fixtures";
import { toPagination } from "../src/modules/patients/history.service";

describe("patient history helpers", () => {
  it("calculates pagination offsets", () => {
    const pagination = toPagination(3, 5);
    expect(pagination).toEqual({ page: 3, limit: 5, skip: 10 });
  });

  it("keeps page and limit for empty datasets", () => {
    const pagination = toPagination(1, 10);
    expect(pagination.page).toBe(1);
    expect(pagination.limit).toBe(10);
    expect(pagination.skip).toBe(0);
  });

  it("uses deterministic synthetic fixtures for patient history scenarios", () => {
    const patient = makePatientFixture();
    const encounter = makeEncounterFixture({ patientId: patient.id });

    expect(patient.firstName).toBe("Ife");
    expect(encounter.patientId).toBe(patient.id);
    expect(syntheticDataGuidelines.length).toBeGreaterThanOrEqual(3);
  });
});
