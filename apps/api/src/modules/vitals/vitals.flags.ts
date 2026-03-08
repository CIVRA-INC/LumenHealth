import type { VitalsFlag } from "./models/vitals.model";

type Input = {
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  temperature: number;
};

const heartRateBandForAge = (ageYears: number) => {
  if (ageYears < 1) {
    return { min: 100, max: 160 };
  }

  if (ageYears < 12) {
    return { min: 70, max: 130 };
  }

  return { min: 60, max: 100 };
};

const bloodPressureBandForAge = (ageYears: number) => {
  if (ageYears < 12) {
    return {
      systolic: { min: 80, max: 120 },
      diastolic: { min: 50, max: 80 },
    };
  }

  return {
    systolic: { min: 90, max: 140 },
    diastolic: { min: 60, max: 90 },
  };
};

export const calculateVitalsFlags = (ageYears: number, input: Input): VitalsFlag[] => {
  const flags = new Set<VitalsFlag>();

  if (input.temperature >= 39) {
    flags.add("CRITICAL_FEVER");
  } else if (input.temperature > 37.5) {
    flags.add("FEVER");
  }

  const hrBand = heartRateBandForAge(ageYears);
  if (input.heartRate > hrBand.max) {
    flags.add("TACHYCARDIA");
  }
  if (input.heartRate < hrBand.min) {
    flags.add("BRADYCARDIA");
  }

  const bpBand = bloodPressureBandForAge(ageYears);
  if (input.bpSystolic > bpBand.systolic.max || input.bpDiastolic > bpBand.diastolic.max) {
    flags.add("HYPERTENSION");
  }

  if (input.bpSystolic < bpBand.systolic.min || input.bpDiastolic < bpBand.diastolic.min) {
    flags.add("HYPOTENSION");
  }

  return Array.from(flags);
};
