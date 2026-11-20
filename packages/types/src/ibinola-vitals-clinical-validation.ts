export type IbinolaTemperatureUnit = "C" | "F";

export interface IbinolaVitalsValues {
  heartRateBpm?: number;
  systolicMmHg?: number;
  diastolicMmHg?: number;
  temperature?: number;
  temperatureUnit?: IbinolaTemperatureUnit;
  spo2Percent?: number;
  weightKg?: number;
}

export interface IbinolaVitalsIssue {
  field: string;
  severity: "warning" | "error";
  message: string;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function roundTripTemperature(value: number, unit: IbinolaTemperatureUnit): number {
  return unit === "C" ? fahrenheitToCelsius(celsiusToFahrenheit(value)) : celsiusToFahrenheit(fahrenheitToCelsius(value));
}

function check(
  issues: IbinolaVitalsIssue[],
  field: string,
  value: number | undefined,
  hard: [number, number],
  soft: [number, number],
  label: string,
): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < hard[0] || value > hard[1]) {
    issues.push({ field, severity: "error", message: `${label} is outside possible range` });
    return;
  }
  if (value < soft[0] || value > soft[1]) {
    issues.push({ field, severity: "warning", message: `${label} is unusual and requires confirmation` });
  }
}

export function validateIbinolaVitals(values: IbinolaVitalsValues): { ok: boolean; issues: IbinolaVitalsIssue[] } {
  const issues: IbinolaVitalsIssue[] = [];
  check(issues, "heartRateBpm", values.heartRateBpm, [20, 260], [40, 180], "Heart rate");
  check(issues, "systolicMmHg", values.systolicMmHg, [50, 260], [90, 180], "Systolic BP");
  check(issues, "diastolicMmHg", values.diastolicMmHg, [30, 160], [60, 120], "Diastolic BP");
  check(issues, "spo2Percent", values.spo2Percent, [50, 100], [90, 100], "SpO2");
  check(issues, "weightKg", values.weightKg, [0.5, 400], [2, 250], "Weight");
  if (values.temperature !== undefined) {
    const c = (values.temperatureUnit ?? "C") === "F" ? fahrenheitToCelsius(values.temperature) : values.temperature;
    if (!Number.isFinite(c) || c < 30 || c > 45) {
      issues.push({ field: "temperature", severity: "error", message: "Temperature is outside possible range" });
    } else if (c < 35 || c > 38.5) {
      issues.push({ field: "temperature", severity: "warning", message: "Temperature is unusual and requires confirmation" });
    }
  }
  return { ok: !issues.some((i) => i.severity === "error"), issues };
}
