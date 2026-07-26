export interface CreatePatientIdentityInput {
  nationalId: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
}

export interface PatientIdentityServiceResult {
  success: boolean;
  patientId: string;
  status: string;
}
