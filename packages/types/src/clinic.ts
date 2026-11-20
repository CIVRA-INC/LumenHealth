export type ClinicStatus = "active" | "suspended" | "archived";

export type Clinic = {
  clinicId: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  status: ClinicStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

// CreateClinicRequest and UpdateClinicRequest are derived from the zod schemas
// in ./schemas/clinic.ts and exported from the package barrel.

export type ClinicErrorCode =
  | "CLINIC_NOT_FOUND"
  | "CLINIC_SLUG_TAKEN"
  | "CLINIC_INVALID_INPUT"
  | "CLINIC_ACCESS_DENIED";

export type ClinicError = {
  error: ClinicErrorCode;
  message: string;
};
