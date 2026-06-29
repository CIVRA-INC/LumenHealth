type Demographics = {
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

function calculateAge(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function maskPhone(phone: string): string {
  const last4 = phone.replace(/\D/g, "").slice(-4);
  return `****${last4}`;
}

function summarize(d: Demographics): Record<string, string> {
  return {
    patientId: d.patientId,
    age: String(calculateAge(d.dateOfBirth)),
    gender: d.gender,
    bloodGroup: d.bloodGroup || "N/A",
    location: `${d.address.city}, ${d.address.country}`,
    emergency: `${d.emergencyContact.name} - ${maskPhone(d.emergencyContact.phone)}`,
  };
}

function validateRequired(data: Partial<Demographics>): string[] {
  const errors: string[] = [];
  if (!data.dateOfBirth) errors.push("Date of birth is required");
  if (!data.gender) errors.push("Gender is required");
  if (!data.emergencyContact?.name) errors.push("Emergency contact name is required");
  if (!data.emergencyContact?.phone) errors.push("Emergency contact phone is required");
  return errors;
}

const fixtures = {
  patientAlice: {
    id: "demo_alice_01",
    patientId: "pat_alice_01",
    dateOfBirth: "1992-07-18",
    gender: "female",
    maritalStatus: "married",
    bloodGroup: "O+",
    occupation: "Doctor",
    nationality: "Nigerian",
    primaryLanguage: "English",
    address: { street: "22 Care Lane", city: "Abuja", state: "FCT", postalCode: "900001", country: "NG" },
    emergencyContact: { name: "Dr. Bob", relationship: "Colleague", phone: "+234-800-555-0200" },
  } satisfies Demographics,
  patientBob: {
    id: "demo_bob_01",
    patientId: "pat_bob_01",
    dateOfBirth: "1978-03-22",
    gender: "male",
    address: { street: "5 Health Rd", city: "Lagos", state: "Lagos", postalCode: "100001", country: "NG" },
    emergencyContact: { name: "Jane", relationship: "Wife", phone: "+234-800-555-0201" },
  } as Demographics,
};

describe("Demographics Mobile — Tests & Fixtures", () => {
  describe("calculateAge", () => {
    it("calculates correct age", () => {
      const age = calculateAge("1992-07-18");
      expect(age).toBeGreaterThanOrEqual(30);
    });
  });

  describe("maskPhone", () => {
    it("masks all but last 4 digits", () => {
      expect(maskPhone("+234-800-555-0200")).toBe("****0200");
    });
  });

  describe("summarize", () => {
    it("produces summary from demographics", () => {
      const s = summarize(fixtures.patientAlice);
      expect(s.patientId).toBe("pat_alice_01");
      expect(s.gender).toBe("female");
    });
  });

  describe("validateRequired", () => {
    it("returns no errors for valid demographics", () => {
      const errors = validateRequired(fixtures.patientAlice);
      expect(errors).toEqual([]);
    });

    it("returns errors for missing fields", () => {
      const errors = validateRequired({ address: {} as Demographics["address"], emergencyContact: {} as Demographics["emergencyContact"] });
      expect(errors).toContain("Date of birth is required");
      expect(errors).toContain("Gender is required");
    });
  });
});
