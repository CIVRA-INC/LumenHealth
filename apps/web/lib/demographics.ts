export type Gender = "male" | "female" | "other" | "prefer-not-to-say";

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export type DemographicsFormData = {
  dateOfBirth: string;
  gender: Gender | "";
  maritalStatus: MaritalStatus | "";
  bloodGroup: BloodGroup | "";
  occupation: string;
  nationality: string;
  primaryLanguage: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
};

export const initialDemographicsForm: DemographicsFormData = {
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  bloodGroup: "",
  occupation: "",
  nationality: "",
  primaryLanguage: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "NG",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyEmail: "",
};

export function demographicsFormToPayload(
  form: DemographicsFormData,
): Record<string, unknown> {
  return {
    dateOfBirth: form.dateOfBirth,
    gender: form.gender,
    maritalStatus: form.maritalStatus || undefined,
    bloodGroup: form.bloodGroup || undefined,
    occupation: form.occupation || undefined,
    nationality: form.nationality || undefined,
    primaryLanguage: form.primaryLanguage || undefined,
    address: {
      street: form.street,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      country: form.country,
    },
    emergencyContact: {
      name: form.emergencyName,
      relationship: form.emergencyRelationship,
      phone: form.emergencyPhone,
      email: form.emergencyEmail || undefined,
    },
  };
}

export function validateDemographicsForm(form: DemographicsFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.dateOfBirth) errors.dateOfBirth = "Date of birth is required";
  if (!form.gender) errors.gender = "Gender is required";
  if (!form.street.trim()) errors.street = "Street is required";
  if (!form.city.trim()) errors.city = "City is required";
  if (!form.state.trim()) errors.state = "State is required";
  if (!form.emergencyName.trim()) errors.emergencyName = "Emergency contact name is required";
  if (!form.emergencyPhone.trim()) errors.emergencyPhone = "Emergency contact phone is required";
  return errors;
}

export function formatAddress(data: {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  return `${data.street}, ${data.city}, ${data.state} ${data.postalCode}, ${data.country}`;
}
