import { describe, expect, it } from "vitest";
import { validatePassword } from "../validators/password.validator.js";

describe("validatePassword (#1475)", () => {
  it("enforces length boundary at 7 and 8", () => {
    expect(validatePassword("1234567")).toBe("password must be at least 8 characters");
    expect(validatePassword("12345678")).toBeNull();
  });

  it("enforces requireUpper toggle", () => {
    expect(validatePassword("lowercase1", { minLength: 8, requireUpper: true, requireNumber: false })).toBe(
      "password must include an uppercase letter",
    );
    expect(validatePassword("Uppercase1", { minLength: 8, requireUpper: true, requireNumber: false })).toBeNull();
  });

  it("enforces requireNumber toggle", () => {
    expect(validatePassword("NoNumbers", { minLength: 8, requireUpper: false, requireNumber: true })).toBe(
      "password must include a number",
    );
    expect(validatePassword("HasNumber1", { minLength: 8, requireUpper: false, requireNumber: true })).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validatePassword("")).toBe("password must be at least 8 characters");
  });

  it("accepts unicode input when length/policy satisfied", () => {
    expect(validatePassword("pässwörd", { minLength: 8, requireUpper: false, requireNumber: false })).toBeNull();
  });
});
