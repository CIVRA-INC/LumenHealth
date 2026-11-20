import { describe, expect, it } from "vitest";
import { mapDanielshipsAuthError, validateDanielshipsLoginForm } from "./danielships-login-form-validation";

describe("danielships login form validation and error mapping", () => {
  it("validates required fields and email format", () => {
    expect(validateDanielshipsLoginForm({ email: "", password: "" })).toEqual({ email: "Email is required", password: "Password is required" });
    expect(validateDanielshipsLoginForm({ email: "bad", password: "x" }).email).toBe("Enter a valid email");
    expect(validateDanielshipsLoginForm({ email: "a@b.com", password: "x" })).toEqual({});
  });

  it("maps typed auth errors to safe user-facing messages", () => {
    expect(mapDanielshipsAuthError("AUTH_INVALID_CREDENTIALS").form).toContain("Incorrect");
    expect(mapDanielshipsAuthError("AUTH_ACCOUNT_LOCKED", "Wait").form).toBe("Wait");
  });
});
