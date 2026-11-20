import { describe, expect, it } from "vitest";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  roundTripTemperature,
  validateIbinolaVitals,
} from "../ibinola-vitals-clinical-validation";

describe("ibinola vitals clinical validation", () => {
  it("blocks impossible values and warns for unusual values", () => {
    const impossible = validateIbinolaVitals({ temperature: 986, temperatureUnit: "F" });
    expect(impossible.ok).toBe(false);
    const unusual = validateIbinolaVitals({ heartRateBpm: 185, spo2Percent: 88 });
    expect(unusual.ok).toBe(true);
    expect(unusual.issues.every((i) => i.severity === "warning")).toBe(true);
  });

  it("round-trips temperature unit conversion", () => {
    expect(celsiusToFahrenheit(37)).toBeCloseTo(98.6, 5);
    expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37, 5);
    expect(roundTripTemperature(36.7, "C")).toBeCloseTo(36.7, 8);
  });
});
