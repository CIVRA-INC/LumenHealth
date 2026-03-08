import { describe, expect, it } from "vitest";
import { calculateVitalsFlags } from "../src/modules/vitals/vitals.flags";

describe("calculateVitalsFlags", () => {
  it("flags FEVER when temperature is > 37.5 and < 39", () => {
    const flags = calculateVitalsFlags(45, {
      bpSystolic: 120,
      bpDiastolic: 80,
      heartRate: 85,
      temperature: 38.2,
    });

    expect(flags).toContain("FEVER");
    expect(flags).not.toContain("CRITICAL_FEVER");
  });

  it("flags CRITICAL_FEVER when temperature is >= 39", () => {
    const flags = calculateVitalsFlags(45, {
      bpSystolic: 120,
      bpDiastolic: 80,
      heartRate: 85,
      temperature: 39.1,
    });

    expect(flags).toContain("CRITICAL_FEVER");
  });

  it("uses adult heart-rate thresholds", () => {
    const high = calculateVitalsFlags(45, {
      bpSystolic: 120,
      bpDiastolic: 80,
      heartRate: 130,
      temperature: 36.8,
    });
    expect(high).toContain("TACHYCARDIA");

    const low = calculateVitalsFlags(45, {
      bpSystolic: 120,
      bpDiastolic: 80,
      heartRate: 45,
      temperature: 36.8,
    });
    expect(low).toContain("BRADYCARDIA");
  });

  it("uses pediatric heart-rate thresholds", () => {
    const child = calculateVitalsFlags(8, {
      bpSystolic: 100,
      bpDiastolic: 65,
      heartRate: 140,
      temperature: 36.9,
    });

    expect(child).toContain("TACHYCARDIA");
  });

  it("flags hypertension and hypotension by age-adjusted BP bands", () => {
    const hyper = calculateVitalsFlags(45, {
      bpSystolic: 160,
      bpDiastolic: 100,
      heartRate: 80,
      temperature: 36.8,
    });
    expect(hyper).toContain("HYPERTENSION");

    const hypo = calculateVitalsFlags(45, {
      bpSystolic: 80,
      bpDiastolic: 50,
      heartRate: 80,
      temperature: 36.8,
    });
    expect(hypo).toContain("HYPOTENSION");
  });
});
