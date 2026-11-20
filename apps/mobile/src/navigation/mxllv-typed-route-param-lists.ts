export type MxllvAuthStackParamList = {
  Login: undefined;
  LockoutCountdown: { retryAfterSeconds: number };
  SessionExpired: { reason?: string };
};

export type MxllvMainStackParamList = {
  Dashboard: undefined;
  PatientList: { clinicId: string; query?: string };
  PatientDetail: { patientId: string };
  EncounterCapture: { patientId: string; encounterId?: string };
  Settings: undefined;
};

export type MxllvRootStackParamList = {
  Auth: { screen?: keyof MxllvAuthStackParamList } | undefined;
  Main: { screen?: keyof MxllvMainStackParamList } | undefined;
};

export type MxllvRouteName = keyof MxllvRootStackParamList | keyof MxllvAuthStackParamList | keyof MxllvMainStackParamList;

export function mxllvRouteRequiresAuth(route: keyof MxllvRootStackParamList): boolean {
  return route === "Main";
}

export function mxllvBuildPatientDetailParams(patientId: string): MxllvMainStackParamList["PatientDetail"] {
  if (!patientId) throw new Error("patientId is required");
  return { patientId };
}
