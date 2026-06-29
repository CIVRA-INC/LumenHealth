type DemographicsRecord = {
  id: string;
  patientId: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus?: string;
  bloodGroup?: string;
  occupation?: string;
  nationality?: string;
  primaryLanguage?: string;
  address: { street: string; city: string; state: string; postalCode: string; country: string };
  emergencyContact: { name: string; relationship: string; phone: string; email?: string };
};

type CreatePayload = Omit<DemographicsRecord, "id" | "patientId" | "createdAt" | "updatedAt">;

function validate(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!payload.dateOfBirth) errors.push("dateOfBirth is required");
  if (!payload.gender) errors.push("gender is required");
  return errors;
}

function create(patientId: string, data: CreatePayload): DemographicsRecord {
  return {
    id: `demo_${Date.now()}`,
    patientId,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function sanitize(data: CreatePayload): CreatePayload {
  return {
    ...data,
    address: { country: "NG", ...data.address },
  };
}

function diff(original: DemographicsRecord, updates: Partial<CreatePayload>): Partial<CreatePayload> {
  const changes: Partial<CreatePayload> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (JSON.stringify(value) !== JSON.stringify((original as Record<string, unknown>)[key])) {
      (changes as Record<string, unknown>)[key] = value;
    }
  }
  return changes;
}

const fixtures = {
  valid: {
    dateOfBirth: "1993-05-10",
    gender: "female",
    maritalStatus: "single",
    bloodGroup: "AB+",
    occupation: "Pharmacist",
    nationality: "Nigerian",
    primaryLanguage: "English",
    address: { street: "7 Pharma Rd", city: "Lagos", state: "Lagos", postalCode: "100001", country: "NG" },
    emergencyContact: { name: "Kemi", relationship: "Sister", phone: "+234-800-555-0300" },
  } satisfies CreatePayload,
  invalid: { dateOfBirth: "", gender: "" } as unknown as CreatePayload,
};

describe("Demographics Integration — Tests & Fixtures", () => {
  describe("validate", () => {
    it("rejects empty payload", () => {
      const errors = validate({});
      expect(errors).toContain("dateOfBirth is required");
      expect(errors).toContain("gender is required");
    });

    it("accepts valid payload", () => {
      expect(validate(fixtures.valid)).toEqual([]);
    });
  });

  describe("create", () => {
    it("creates record with generated id", () => {
      const record = create("pat_int_01", fixtures.valid);
      expect(record.id).toMatch(/^demo_/);
      expect(record.patientId).toBe("pat_int_01");
      expect(record.gender).toBe("female");
    });
  });

  describe("sanitize", () => {
    it("defaults country to NG", () => {
      const payload = { ...fixtures.valid, address: { ...fixtures.valid.address, country: "" } };
      const result = sanitize(payload);
      expect(result.address.country).toBe("NG");
    });
  });

  describe("diff", () => {
    it("detects changes between records", () => {
      const original = create("pat_int_02", fixtures.valid);
      const changes = diff(original, { occupation: "Senior Pharmacist" });
      expect(changes.occupation).toBe("Senior Pharmacist");
    });

    it("returns empty for no changes", () => {
      const original = create("pat_int_03", fixtures.valid);
      const changes = diff(original, fixtures.valid);
      expect(Object.keys(changes)).toHaveLength(0);
    });
  });
});
