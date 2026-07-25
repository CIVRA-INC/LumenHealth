export type GenderCategory = 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say';

export interface EmergencyContactItem {
  name: string;
  relationship: string;
  phoneNumber: string;
}

export interface PatientDemographicRecord {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  bloodType?: string;
  emergencyContact: EmergencyContactItem;
}

export interface DemographicFixtureSeed {
  seedId: string;
  records: PatientDemographicRecord[];
}
