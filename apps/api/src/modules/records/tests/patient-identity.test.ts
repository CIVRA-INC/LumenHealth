import { describe, it, expect } from "vitest";
import { z } from "zod";

const patientIdentityStatusSchema = z.enum(["active", "inactive", "deceased", "pending_verification"]);
const patientIdentityGenderSchema = z.enum(["male", "female", "non_binary", "other", "prefer_not_to_say"]);

const createPatientIdentityRequestSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  gender: patientIdentityGenderSchema,
  mrn: z.string().min(1, "Medical Record Number is required."),
  status: patientIdentityStatusSchema.optional(),
});

const updatePatientIdentityRequestSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().min(1).optional(),
  gender: patientIdentityGenderSchema.optional(),
  status: patientIdentityStatusSchema.optional(),
});

const patientIdentitySchema = z.object({
  patientId: z.string().min(1, "Patient ID is required."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  gender: patientIdentityGenderSchema,
  mrn: z.string().min(1, "Medical Record Number is required."),
  status: patientIdentityStatusSchema,
  identityHash: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const sampleRecords = [
  {
    patientId: "patient_id_001",
    firstName: "Amina",
    lastName: "Okafor",
    dateOfBirth: "1990-03-15",
    gender: "female" as const,
    mrn: "MRN-20260001",
    status: "active" as const,
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-07-20T14:30:00Z",
  },
  {
    patientId: "patient_id_002",
    firstName: "Chukwu",
    lastName: "Eze",
    dateOfBirth: "1985-07-22",
    gender: "male" as const,
    mrn: "MRN-20260002",
    status: "active" as const,
    createdAt: "2026-02-05T10:15:00Z",
    updatedAt: "2026-07-18T09:45:00Z",
  },
  {
    patientId: "patient_id_003",
    firstName: "Fatima",
    lastName: "Abubakar",
    dateOfBirth: "1978-11-03",
    gender: "female" as const,
    mrn: "MRN-20260003",
    status: "pending_verification" as const,
    createdAt: "2026-06-01T12:00:00Z",
    updatedAt: "2026-07-25T16:00:00Z",
  },
];

describe("Patient Identity API contract", () => {
  describe("POST /api/v1/patients — create with identity data", () => {
    const validBody = {
      firstName: "Amina",
      lastName: "Okafor",
      dateOfBirth: "1990-03-15",
      gender: "female",
      mrn: "MRN-20260001",
    };

    it("accepts a valid create request body", () => {
      const result = createPatientIdentityRequestSchema.safeParse(validBody);
      expect(result.success).toBe(true);
    });

    it("requires firstName", () => {
      const { firstName, ...rest } = validBody;
      const result = createPatientIdentityRequestSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("requires lastName", () => {
      const { lastName, ...rest } = validBody;
      const result = createPatientIdentityRequestSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("requires dateOfBirth", () => {
      const { dateOfBirth, ...rest } = validBody;
      const result = createPatientIdentityRequestSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("requires gender", () => {
      const { gender, ...rest } = validBody;
      const result = createPatientIdentityRequestSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("requires mrn", () => {
      const { mrn, ...rest } = validBody;
      const result = createPatientIdentityRequestSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects invalid gender value", () => {
      const result = createPatientIdentityRequestSchema.safeParse({
        ...validBody,
        gender: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("allows optional status field", () => {
      const result = createPatientIdentityRequestSchema.safeParse({
        ...validBody,
        status: "active",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("PATCH /api/v1/patients/:patientId/identity", () => {
    it("accepts a partial update with only firstName", () => {
      const result = updatePatientIdentityRequestSchema.safeParse({ firstName: "NewName" });
      expect(result.success).toBe(true);
    });

    it("accepts a partial update with only status", () => {
      const result = updatePatientIdentityRequestSchema.safeParse({ status: "inactive" });
      expect(result.success).toBe(true);
    });

    it("accepts an empty body (no-op)", () => {
      const result = updatePatientIdentityRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects invalid status value", () => {
      const result = updatePatientIdentityRequestSchema.safeParse({ status: "bogus" });
      expect(result.success).toBe(false);
    });
  });

  describe("GET /api/v1/patients/:patientId/identity — response shape", () => {
    it("all fixture records pass the patientIdentitySchema", () => {
      for (const record of sampleRecords) {
        const result = patientIdentitySchema.safeParse(record);
        expect(result.success).toBe(true);
      }
    });

    it("fixture records have consistent required fields", () => {
      for (const record of sampleRecords) {
        expect(record.patientId).toBeTruthy();
        expect(record.firstName).toBeTruthy();
        expect(record.lastName).toBeTruthy();
        expect(record.dateOfBirth).toBeTruthy();
        expect(record.mrn).toBeTruthy();
        expect(record.createdAt).toBeTruthy();
        expect(record.updatedAt).toBeTruthy();
      }
    });

    it("fixture patient IDs are unique", () => {
      const ids = sampleRecords.map((r) => r.patientId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("fixture MRNs are unique", () => {
      const mrns = sampleRecords.map((r) => r.mrn);
      expect(new Set(mrns).size).toBe(mrns.length);
    });
  });
});
