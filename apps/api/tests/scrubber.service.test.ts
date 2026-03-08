import { describe, expect, it } from "vitest";
import type { ClinicalNote, Diagnosis, Patient, Vitals } from "@lumen/types";
import {
  assembleContext,
  calculateAgeFromDateOfBirth,
} from "../src/modules/ai/scrubber.service";

const patientFixture: Patient = {
  id: "p_1",
  systemId: "LMN-1234",
  firstName: "Jane",
  lastName: "Doe",
  dateOfBirth: "1990-05-15T00:00:00.000Z",
  sex: "F",
  contactNumber: "+1-202-555-0188",
  address: "42 Health Ave",
  isActive: true,
};

const vitalsFixture: Vitals[] = [
  {
    id: "v1",
    encounterId: "enc-1",
    authorId: "u-1",
    timestamp: "2026-03-01T08:00:00.000Z",
    bpSystolic: 120,
    bpDiastolic: 80,
    heartRate: 102,
    temperature: 39.1,
    respirationRate: 20,
    spO2: 96,
    weight: 70,
  },
];

const notesFixture: ClinicalNote[] = [
  {
    id: "n1",
    encounterId: "enc-1",
    authorId: "u-1",
    type: "SOAP",
    content: "   Patient with fever and chills.   ",
    timestamp: "2026-03-01T08:05:00.000Z",
  },
];

const diagnosesFixture: Diagnosis[] = [
  {
    id: "d1",
    encounterId: "enc-1",
    code: "B50.9",
    description: "Malaria",
    status: "CONFIRMED",
  },
];

describe("calculateAgeFromDateOfBirth", () => {
  it("returns years and months for valid date", () => {
    const age = calculateAgeFromDateOfBirth(
      "1990-05-15T00:00:00.000Z",
      new Date("2026-03-06T00:00:00.000Z"),
    );

    expect(age).toEqual({ years: 35, months: 9 });
  });

  it("handles younger than one year", () => {
    const age = calculateAgeFromDateOfBirth(
      "2025-12-20T00:00:00.000Z",
      new Date("2026-03-06T00:00:00.000Z"),
    );

    expect(age.years).toBe(0);
    expect(age.months).toBe(2);
  });

  it("throws for invalid DOB", () => {
    expect(() =>
      calculateAgeFromDateOfBirth("not-a-date", new Date("2026-03-06T00:00:00.000Z")),
    ).toThrow("Invalid patient dateOfBirth");
  });
});

describe("assembleContext", () => {
  it("builds strict markdown template with scrubbed patient header", () => {
    const output = assembleContext({
      patient: patientFixture,
      vitals: vitalsFixture,
      notes: notesFixture,
      diagnoses: diagnosesFixture,
      now: new Date("2026-03-06T00:00:00.000Z"),
    });

    expect(output).toContain("# Clinical Context (PHI-Scrubbed)");
    expect(output).toContain("Patient: 35y 9m, Sex F");
    expect(output).toContain("System ID: LMN-1234");
    expect(output).toContain("## Vitals");
    expect(output).toContain("## Clinical Notes");
    expect(output).toContain("## Diagnoses");
    expect(output).toContain("B50.9: Malaria (CONFIRMED)");
  });

  it("uses no-data placeholders when sections are empty", () => {
    const output = assembleContext({
      patient: patientFixture,
      vitals: [],
      notes: [],
      diagnoses: [],
      now: new Date("2026-03-06T00:00:00.000Z"),
    });

    expect(output).toContain("- No vitals available");
    expect(output).toContain("- No notes available");
    expect(output).toContain("- No diagnoses available");
  });

  it("mathematically proves PHI strings are absent from output", () => {
    const output = assembleContext({
      patient: patientFixture,
      vitals: vitalsFixture,
      notes: notesFixture,
      diagnoses: diagnosesFixture,
      now: new Date("2026-03-06T00:00:00.000Z"),
    });

    const forbiddenTokens = [
      patientFixture.firstName,
      patientFixture.lastName,
      patientFixture.contactNumber,
      patientFixture.address,
      patientFixture.dateOfBirth,
      patientFixture.id,
      "Jane Doe",
      "202-555-0188",
    ];

    forbiddenTokens.forEach((token) => {
      expect(output.includes(token)).toBe(false);
    });
  });

  it("sanitizes note whitespace and keeps chronology", () => {
    const output = assembleContext({
      patient: patientFixture,
      vitals: vitalsFixture,
      notes: [
        {
          ...notesFixture[0],
          id: "n0",
          timestamp: "2026-03-01T08:04:00.000Z",
          content: "  First note   with   spacing  ",
        },
        notesFixture[0],
      ],
      diagnoses: diagnosesFixture,
      now: new Date("2026-03-06T00:00:00.000Z"),
    });

    const firstIdx = output.indexOf("First note with spacing");
    const secondIdx = output.indexOf("Patient with fever and chills.");
    expect(firstIdx).toBeGreaterThan(0);
    expect(secondIdx).toBeGreaterThan(firstIdx);
  });
});
