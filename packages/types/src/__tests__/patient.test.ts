import { describe, expect, it } from "vitest";
import {
  createPatientIdentityRequestSchema,
  patientMasterRecordSchema,
  updatePatientIdentityRequestSchema,
} from "../patient.js";

const patientId = "123e4567-e89b-12d3-a456-426614174000";
const clinicId = "987e6543-e89b-12d3-a456-426614174000";

describe("patient master record schemas", () => {
  it("accepts a complete clinic-scoped patient record", () => {
    const result = patientMasterRecordSchema.safeParse({
      id: patientId,
      nationalId: "NAT-123456",
      fullName: "Jane Doe",
      dateOfBirth: "1990-05-15",
      gender: "female",
      bloodGroup: "A+",
      emergencyContact: {
        name: "John Doe",
        relationship: "spouse",
        phoneNumber: "+2348012345678",
      },
      createdAt: "2026-07-29T10:00:00.000Z",
      updatedAt: "2026-07-29T10:00:00.000Z",
      header: {
        patientId,
        status: "active",
        primaryClinicId: clinicId,
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects malformed identity and tenant identifiers", () => {
    const result = createPatientIdentityRequestSchema.safeParse({
      nationalId: "123",
      fullName: "J",
      dateOfBirth: "15-05-1990",
      gender: "unknown",
      emergencyContact: { name: "", relationship: "", phoneNumber: "12" },
      primaryClinicId: "clinic-1",
    });

    expect(result.success).toBe(false);
  });

  it("allows partial identity updates but never changes the primary clinic", () => {
    expect(updatePatientIdentityRequestSchema.safeParse({ bloodGroup: "O-" }).success).toBe(true);
    expect(updatePatientIdentityRequestSchema.safeParse({ primaryClinicId: clinicId }).success).toBe(false);
  });
});