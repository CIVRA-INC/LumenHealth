import {
  createDemographicsRecord,
  validateDemographics,
  sanitizeDemographics,
  type CreateDemographicsPayload,
  type DemographicsRecord,
} from "../demographics/model";

const validPayload: CreateDemographicsPayload = {
  dateOfBirth: "1990-04-12",
  gender: "female",
  maritalStatus: "married",
  bloodGroup: "O+",
  occupation: "Software Engineer",
  nationality: "Nigerian",
  primaryLanguage: "English",
  address: {
    street: "42 Peace Avenue",
    city: "Lagos",
    state: "Lagos",
    postalCode: "100001",
    country: "NG",
  },
  emergencyContact: {
    name: "Carlos Mendoza",
    relationship: "Spouse",
    phone: "+234-800-555-0199",
    email: "carlos@example.com",
  },
};

const fixtures = {
  validPayload,
  minimalPayload: {
    dateOfBirth: "1985-07-22",
    gender: "male" as const,
    address: { street: "1 Main St", city: "Abuja", state: "FCT", postalCode: "900001", country: "NG" },
    emergencyContact: { name: "Jane Doe", relationship: "Sister", phone: "+234-800-555-0001" },
  } satisfies CreateDemographicsPayload,
  missingFields: { dateOfBirth: "", gender: "", address: {}, emergencyContact: {} } as unknown as Record<string, unknown>,
};

describe("validateDemographics", () => {
  it("returns no errors for a valid payload", () => {
    expect(validateDemographics(fixtures.validPayload)).toEqual([]);
  });

  it("returns errors for missing required fields", () => {
    const errors = validateDemographics(fixtures.missingFields);
    expect(errors).toContain("dateOfBirth is required");
    expect(errors).toContain("gender must be one of: male, female, other, prefer-not-to-say");
  });

  it("rejects invalid bloodGroup", () => {
    const invalid = { ...validPayload, bloodGroup: "Z+" };
    const errors = validateDemographics(invalid);
    expect(errors).toContain("bloodGroup is not valid");
  });

  it("requires emergencyContact fields when provided", () => {
    const missingEc = { ...validPayload, emergencyContact: {} };
    const errors = validateDemographics(missingEc as unknown as Record<string, unknown>);
    expect(errors).toContain("emergencyContact.name is required");
    expect(errors).toContain("emergencyContact.phone is required");
  });
});

describe("sanitizeDemographics", () => {
  it("defaults country to NG when not provided", () => {
    const noCountry = {
      ...validPayload,
      address: { ...validPayload.address, country: "" },
    };
    const result = sanitizeDemographics(noCountry);
    expect(result.address.country).toBe("NG");
  });
});

describe("createDemographicsRecord", () => {
  it("creates a record with generated id and timestamps", () => {
    const record = createDemographicsRecord(fixtures.validPayload, "pat_alice_01", "clinic_demo_01");
    expect(record.id).toMatch(/^demo_/);
    expect(record.patientId).toBe("pat_alice_01");
    expect(record.clinicId).toBe("clinic_demo_01");
    expect(record.createdAt).toBeDefined();
    expect(record.updatedAt).toBeDefined();
    expect(record.createdAt).toBe(record.updatedAt);
  });

  it("preserves all provided demographics data", () => {
    const record = createDemographicsRecord(fixtures.validPayload, "pat_alice_01", "clinic_demo_01");
    expect(record.dateOfBirth).toBe("1990-04-12");
    expect(record.gender).toBe("female");
    expect(record.bloodGroup).toBe("O+");
    expect(record.address.country).toBe("NG");
  });

  it("handles minimal payload without optional fields", () => {
    const record = createDemographicsRecord(fixtures.minimalPayload, "pat_bob_01", "clinic_demo_02");
    expect(record.occupation).toBeUndefined();
    expect(record.maritalStatus).toBeUndefined();
  });
});
