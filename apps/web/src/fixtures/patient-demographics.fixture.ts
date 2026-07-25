import type { DemographicFixtureSeed } from '@qyou/shared';

export const mockWebPatientDemographicsFixture: DemographicFixtureSeed = {
  seedId: 'demo_seed_web_001',
  records: [
    {
      patientId: 'patient_401',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1992-05-14',
      gender: 'female',
      bloodType: 'O+',
      emergencyContact: {
        name: 'John Doe',
        relationship: 'Spouse',
        phoneNumber: '+1-555-0199',
      },
    },
  ],
};
