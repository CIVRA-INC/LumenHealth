export interface PatientIdentityContractResponse {
  id: string;
  nationalId: string;
  fullName: string;
  status: string;
  verified: boolean;
}

export interface PatientIdentityContractQuery {
  nationalId?: string;
  clinicId?: string;
}
