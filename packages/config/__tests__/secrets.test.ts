import { beforeEach, describe, expect, it, vi } from "vitest";
import { assessSecret, enforceSecret, resetSecretWarnings } from "../secrets.js";

const rules = { minLength: 32 };
const strong = "k3F9qZ0rVb7yT1mXw8LdPn4sA6uHj2Ec5GoRi";
const placeholder = "change-me-before-production-use";

beforeEach(() => resetSecretWarnings());

describe("enforceSecret", () => {
  it("throws in production for the .env.example placeholder", () => {
    expect(() => enforceSecret("JWT_SECRET", placeholder, rules, { NODE_ENV: "production" })).toThrow(/JWT_SECRET is still a placeholder/);
  });

  it("throws in production for a short secret", () => {
    expect(() => enforceSecret("JWT_SECRET", "short-but-unique-value", rules, { NODE_ENV: "production" })).toThrow(
      /at least 32 characters/,
    );
  });

  it("accepts a strong secret in production", () => {
    expect(enforceSecret("JWT_SECRET", strong, rules, { NODE_ENV: "production" })).toBe(strong);
  });

  it("warns once in development and returns the value", () => {
    const warn = vi.fn();
    expect(enforceSecret("JWT_SECRET", placeholder, rules, { NODE_ENV: "development" }, warn)).toBe(placeholder);
    enforceSecret("JWT_SECRET", placeholder, rules, { NODE_ENV: "development" }, warn);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("never echoes the secret in errors or warnings", () => {
    const warn = vi.fn();
    enforceSecret("JWT_SECRET", placeholder, rules, {}, warn);
    expect(warn.mock.calls.join()).not.toContain(placeholder);

    try {
      enforceSecret("JWT_SECRET", placeholder, rules, { NODE_ENV: "production" });
    } catch (error) {
      expect((error as Error).message).not.toContain(placeholder);
    }
  });

  it("applies only the placeholder check when no minimum length is given", () => {
    expect(enforceSecret("INTERNAL_SERVICE_TOKEN", "dev-internal-token", {}, { NODE_ENV: "production" })).toBe("dev-internal-token");
    expect(() => enforceSecret("INTERNAL_SERVICE_TOKEN", placeholder, {}, { NODE_ENV: "production" })).toThrow(/placeholder/);
  });
});

describe("assessSecret", () => {
  it.each(["<generate with: openssl rand -base64 48>", "ChangeMe", "REPLACE-ME-please"])("flags %j as a placeholder", (value) => {
    expect(assessSecret("X", value).ok).toBe(false);
  });
});
