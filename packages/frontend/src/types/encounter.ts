export interface Encounter {
  id: string;
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  createdAt: string | Date;
}

export interface VitalData {
  date: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
}
