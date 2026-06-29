export type Demographics = {
  id: string;
  patientId: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  occupation: string;
  nationality: string;
  primaryLanguage: string;
  fullAddress: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
};

export type DemographicsSummary = {
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  location: string;
};

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function demographicsToSummary(d: Demographics): DemographicsSummary {
  return {
    fullName: d.patientId,
    age: calculateAge(d.dateOfBirth),
    gender: d.gender,
    bloodGroup: d.bloodGroup,
    location: d.fullAddress.split(",").slice(-2).join(",").trim(),
  };
}

export function validateDemographicsRecord(data: Partial<Demographics>): string[] {
  const errors: string[] = [];
  if (!data.dateOfBirth) errors.push("Date of birth is required");
  if (!data.gender) errors.push("Gender is required");
  if (!data.emergencyContactName) errors.push("Emergency contact name is required");
  if (!data.emergencyContactPhone) errors.push("Emergency contact phone is required");
  return errors;
}

export const defaultDemographics: Demographics = {
  id: "",
  patientId: "",
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  bloodGroup: "",
  occupation: "",
  nationality: "",
  primaryLanguage: "",
  fullAddress: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
};

export const bloodGroupOptions = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
] as const;

export const genderOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
] as const;
