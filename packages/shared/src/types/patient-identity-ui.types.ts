export interface PatientIdentityUIState {
  patientId: string | null;
  isLoading: boolean;
  activeTab: 'summary' | 'demographics' | 'verification';
  error: string | null;
}
