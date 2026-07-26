export interface PatientIdentityModel {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface PatientRecordHeader {
  patientId: string;
  status: 'active' | 'archived' | 'pending_verification';
  primaryClinicId: string;
}
