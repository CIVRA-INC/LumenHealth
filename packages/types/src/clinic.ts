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

export type CreateClinicRequest = {
  name: string;
  address: string;
  phone: string;
  email: string;
};

export type UpdateClinicRequest = Partial<Pick<Clinic, "name" | "address" | "phone" | "email">>;

export type ClinicErrorCode =
  | "CLINIC_NOT_FOUND"
  | "CLINIC_SLUG_TAKEN"
  | "CLINIC_INVALID_INPUT"
  | "CLINIC_ACCESS_DENIED";

export type ClinicError = {
  error: ClinicErrorCode;
  message: string;
};
