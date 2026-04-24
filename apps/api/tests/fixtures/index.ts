type ClinicFixture = {
  id: string;
  name: string;
  location: string;
  code: string;
};

type StaffFixture = {
  id: string;
  clinicId: string;
  role: 'ADMIN' | 'PROVIDER' | 'NURSE';
  firstName: string;
  lastName: string;
  email: string;
};

type PatientFixture = {
  id: string;
  clinicId: string;
  systemId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'M' | 'F' | 'O';
  contactNumber: string;
  address: string;
};

type EncounterFixture = {
  id: string;
  clinicId: string;
  patientId: string;
  providerId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
};

type PaymentFixture = {
  id: string;
  clinicId: string;
  amount: string;
  memo: string;
  status: 'pending' | 'verified' | 'failed';
};

const timestamp = '2026-01-15T09:30:00.000Z';

export const makeClinicFixture = (overrides: Partial<ClinicFixture> = {}): ClinicFixture => ({
  id: 'clinic_demo_001',
  name: 'North Star Community Clinic',
  location: 'Lagos Mainland',
  code: 'NSC-001',
  ...overrides,
});

export const makeStaffFixture = (overrides: Partial<StaffFixture> = {}): StaffFixture => ({
  id: 'staff_provider_001',
  clinicId: 'clinic_demo_001',
  role: 'PROVIDER',
  firstName: 'Ada',
  lastName: 'Nwosu',
  email: 'ada.provider@synthetic.lumen.test',
  ...overrides,
});

export const makePatientFixture = (overrides: Partial<PatientFixture> = {}): PatientFixture => ({
  id: 'patient_demo_001',
  clinicId: 'clinic_demo_001',
  systemId: 'LH-000001',
  firstName: 'Ife',
  lastName: 'Adeyemi',
  dateOfBirth: '1994-01-03T00:00:00.000Z',
  sex: 'F',
  contactNumber: '+2348000000001',
  address: 'Synthetic Address Block A',
  ...overrides,
});

export const makeEncounterFixture = (
  overrides: Partial<EncounterFixture> = {},
): EncounterFixture => ({
  id: 'encounter_demo_001',
  clinicId: 'clinic_demo_001',
  patientId: 'patient_demo_001',
  providerId: 'staff_provider_001',
  status: 'IN_PROGRESS',
  openedAt: timestamp,
  closedAt: null,
  ...overrides,
});

export const makePaymentFixture = (overrides: Partial<PaymentFixture> = {}): PaymentFixture => ({
  id: 'payment_demo_001',
  clinicId: 'clinic_demo_001',
  amount: '100',
  memo: 'memo-demo-001',
  status: 'pending',
  ...overrides,
});

export const syntheticDataGuidelines = [
  'Use obviously synthetic names, emails, and addresses.',
  'Do not embed real clinic identifiers, phone numbers, or wallet data.',
  'Prefer deterministic ids and timestamps so tests remain snapshot-friendly.',
];
