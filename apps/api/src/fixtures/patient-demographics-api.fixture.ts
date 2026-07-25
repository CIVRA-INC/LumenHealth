import type { DemographicFixtureSeed } from '@qyou/shared';

export const mockApiPatientDemographicsFixture: DemographicFixtureSeed = {
  seedId: 'demo_seed_api_002',
  records: [
    {
      patientId: 'patient_402',
      firstName: 'Robert',
      lastName: 'Smith',
      dateOfBirth: '1985-11-22',
      gender: 'male',
      bloodType: 'A-',
      emergencyContact: {
        name: 'Mary Smith',
        relationship: 'Sister',
        phoneNumber: '+1-555-0188',
      },
    },
  ],
};
