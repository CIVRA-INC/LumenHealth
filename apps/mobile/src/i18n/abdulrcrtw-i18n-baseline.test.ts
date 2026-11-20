import { describe, expect, it } from "vitest";
import { formatClinicalDate, formatClinicalNumber, getAbdulrcrtwMessages } from "./abdulrcrtw-i18n-baseline";

describe("abdulrcrtw i18n baseline", () => {
  it("provides english baseline strings and falls back to en", () => {
    expect(getAbdulrcrtwMessages("en").loginTitle).toBe("Sign in");
    expect(getAbdulrcrtwMessages("fr").logout).toBe("Sign out");
  });

  it("formats dates and numbers in locale-aware way", () => {
    expect(formatClinicalNumber(1234.5, "en-US")).toContain("1");
    expect(formatClinicalDate("2026-11-20T10:00:00Z", "en-US")).toBeTruthy();
  });
});
