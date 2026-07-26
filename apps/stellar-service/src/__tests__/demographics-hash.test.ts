import { describe, expect, it } from "vitest";
import { hashDemographics } from "../demographics-hash.js";

const sample = {
  patientId: "p-001",
  firstName: "Jane",
  lastName: "Doe",
  dateOfBirth: "1990-03-15",
  gender: "female",
  bloodType: "O+",
  phone: "+1-555-0100",
  email: "jane.doe@example.com",
  address: "123 Main St",
  emergencyContact: { name: "John Doe", relationship: "spouse", phoneNumber: "+1-555-0101" },
  insuranceInfo: { provider: "Acme Health", policyNumber: "POL-123" },
  medicalRecordNumber: "MRN-001",
  clinicId: "c-100",
};

describe("hashDemographics", () => {
  it("produces a deterministic 64-char hex digest", () => {
    const a = hashDemographics(sample);
    const b = hashDemographics(sample);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
  });

  it("produces the same hash regardless of key order", () => {
    const reordered = {
      clinicId: "c-100",
      firstName: "Jane",
      lastName: "Doe",
      emergencyContact: { phoneNumber: "+1-555-0101", name: "John Doe", relationship: "spouse" },
      insuranceInfo: { policyNumber: "POL-123", provider: "Acme Health" },
      patientId: "p-001",
      gender: "female",
      phone: "+1-555-0100",
      address: "123 Main St",
      email: "jane.doe@example.com",
      medicalRecordNumber: "MRN-001",
      dateOfBirth: "1990-03-15",
      bloodType: "O+",
    };
    expect(hashDemographics(sample)).toBe(hashDemographics(reordered));
  });

  it("produces a different hash for a different input", () => {
    const modified = { ...sample, firstName: "Jon" };
    expect(hashDemographics(sample)).not.toBe(hashDemographics(modified));
  });
});
