type PatientProfile = {
  id: string;
  name: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: { name: string; phone: string };
};

type ProfileSection = {
  label: string;
  value: string;
};

function profileToSections(patient: PatientProfile): ProfileSection[] {
  return [
    { label: "Full Name", value: patient.name },
    { label: "Date of Birth", value: patient.dateOfBirth },
    { label: "Phone", value: patient.phone },
    { label: "Email", value: patient.email },
    { label: "Address", value: patient.address },
    { label: "Emergency Contact", value: `${patient.emergencyContact.name} (${patient.emergencyContact.phone})` },
  ];
}

function formatDob(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function maskPhone(phone: string): string {
  const visible = phone.slice(-4);
  return `****${visible}`;
}

function validateProfile(data: Partial<PatientProfile>): string[] {
  const errors: string[] = [];
  if (!data.name?.trim()) errors.push("Name is required");
  if (!data.dateOfBirth?.trim()) errors.push("Date of birth is required");
  if (!data.phone?.trim()) errors.push("Phone is required");
  else if (!/^\+?[\d\-().\s]+$/.test(data.phone)) errors.push("Phone format is invalid");
  return errors;
}

const fixtures = {
  patientAlice: {
    id: "pat_alice_01",
    name: "Alice Mendoza",
    dateOfBirth: "1990-04-12",
    phone: "+1-555-0100",
    email: "alice.mendoza@example.com",
    address: "123 Wellness Ave, Suite 4, Lagos",
    emergencyContact: { name: "Carlos Mendoza", phone: "+1-555-0199" },
  } satisfies PatientProfile,

  partialProfile: {
    name: "",
    dateOfBirth: "",
    phone: "invalid-phone",
  } satisfies Partial<PatientProfile>,
};

describe("PatientProfile", () => {
  describe("profileToSections", () => {
    it("returns all six sections for a valid patient", () => {
      const sections = profileToSections(fixtures.patientAlice);
      expect(sections).toHaveLength(6);
      expect(sections[0]).toEqual({ label: "Full Name", value: "Alice Mendoza" });
    });

    it("includes emergency contact as a combined string", () => {
      const sections = profileToSections(fixtures.patientAlice);
      const ec = sections.find((s) => s.label === "Emergency Contact");
      expect(ec?.value).toBe("Carlos Mendoza (+1-555-0199)");
    });
  });

  describe("formatDob", () => {
    it("formats ISO date to readable US format", () => {
      expect(formatDob("1990-04-12")).toBe("April 12, 1990");
    });
  });

  describe("maskPhone", () => {
    it("masks all but last four digits", () => {
      expect(maskPhone("+1-555-0100")).toBe("****0100");
    });
  });

  describe("validateProfile", () => {
    it("returns no errors for a complete profile", () => {
      expect(validateProfile(fixtures.patientAlice)).toEqual([]);
    });

    it("returns errors when required fields are missing", () => {
      const errors = validateProfile(fixtures.partialProfile);
      expect(errors).toContain("Name is required");
      expect(errors).toContain("Date of birth is required");
    });

    it("rejects invalid phone format", () => {
      const errors = validateProfile(fixtures.partialProfile);
      expect(errors).toContain("Phone format is invalid");
    });
  });
});
