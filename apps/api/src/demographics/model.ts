export type Gender = "male" | "female" | "other" | "prefer-not-to-say";

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export type DemographicsRecord = {
  id: string;
  patientId: string;
  clinicId: string;
  dateOfBirth: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  bloodGroup: BloodGroup;
  occupation: string;
  nationality: string;
  primaryLanguage: string;
  address: Address;
  emergencyContact: EmergencyContact;
  createdAt: string;
  updatedAt: string;
};

export type Address = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
};

export type CreateDemographicsPayload = Omit<
  DemographicsRecord,
  "id" | "clinicId" | "createdAt" | "updatedAt"
>;

export type UpdateDemographicsPayload = Partial<
  Omit<DemographicsRecord, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">
>;

export function sanitizeDemographics(payload: CreateDemographicsPayload): CreateDemographicsPayload {
  return {
    ...payload,
    address: {
      ...payload.address,
      country: payload.address.country || "NG",
    },
  };
}

export function validateDemographics(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!payload.dateOfBirth || typeof payload.dateOfBirth !== "string") errors.push("dateOfBirth is required");
  if (!payload.gender || !["male", "female", "other", "prefer-not-to-say"].includes(payload.gender as string))
    errors.push("gender must be one of: male, female, other, prefer-not-to-say");
  if (payload.bloodGroup && !["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(payload.bloodGroup as string))
    errors.push("bloodGroup is not valid");
  if (payload.emergencyContact && typeof payload.emergencyContact === "object") {
    const ec = payload.emergencyContact as Record<string, unknown>;
    if (!ec.name) errors.push("emergencyContact.name is required");
    if (!ec.phone) errors.push("emergencyContact.phone is required");
  }
  return errors;
}

export function createDemographicsRecord(
  payload: CreateDemographicsPayload,
  patientId: string,
  clinicId: string,
): DemographicsRecord {
  const sanitized = sanitizeDemographics(payload);
  const now = new Date().toISOString();
  return {
    id: `demo_${Date.now()}`,
    patientId,
    clinicId,
    ...sanitized,
    createdAt: now,
    updatedAt: now,
  };
}
