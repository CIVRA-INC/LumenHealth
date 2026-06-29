export type Vitals = {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  height: number;
};

export type ChartRecord = {
  patientId: string;
  date: string;
  type: string;
  vitals: Vitals;
  medications: string[];
  provider: string;
  notes: string;
};

export type ChartSummary = {
  id: string;
  title: string;
  date: string;
  bp: string;
  bmi: number;
};

let idCounter = 0;

export function createChartRecord(data: ChartRecord): ChartSummary {
  idCounter++;
  const bmi = calcBMI(data.vitals.weight, data.vitals.height);
  return {
    id: `chart_${idCounter}`,
    title: `${data.type} - ${data.date}`,
    date: data.date,
    bp: `${data.vitals.systolic}/${data.vitals.diastolic}`,
    bmi,
  };
}

export function calcBMI(weight: number, heightCm: number): number {
  return Math.round((weight / ((heightCm / 100) * (heightCm / 100))) * 10) / 10;
}

export function categorizeBmi(bmi: number): string {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function validateVitals(v: Partial<Vitals>): string[] {
  const e: string[] = [];
  if (!v.systolic || v.systolic < 60 || v.systolic > 250) e.push("Systolic 60-250");
  if (v.diastolic === undefined || v.diastolic < 30 || v.diastolic > 150) e.push("Diastolic 30-150");
  if (!v.heartRate || v.heartRate < 30 || v.heartRate > 250) e.push("Heart rate 30-250");
  if (!v.weight || v.weight < 20 || v.weight > 300) e.push("Weight 20-300 kg");
  return e;
}

export const fixtures = {
  patientId: "pat_model_mob_01",
  validVitals: { systolic: 118, diastolic: 78, heartRate: 70, temperature: 36.7, weight: 72, height: 180 },
  invalidVitals: { systolic: 300, diastolic: 0, heartRate: 5, weight: 500, height: 1 },
};
