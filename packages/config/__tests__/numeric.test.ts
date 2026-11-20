import { describe, expect, it } from "vitest";
import { assertNoViolations, checkHttpUrl, parseIntSetting } from "../numeric.js";

const port = { min: 1, max: 65535 };

function parse(raw: string | undefined, bounds: { min: number; max?: number } = port, fallback = 4000) {
  const violations: string[] = [];
  const value = parseIntSetting("API_PORT", raw, fallback, bounds, violations);
  return { value, violations };
}

describe("parseIntSetting", () => {
  it("returns the fallback for missing and empty values", () => {
    expect(parse(undefined)).toEqual({ value: 4000, violations: [] });
    expect(parse("")).toEqual({ value: 4000, violations: [] });
    expect(parse("   ")).toEqual({ value: 4000, violations: [] });
  });

  it("accepts valid integers, trimmed", () => {
    expect(parse("8080")).toEqual({ value: 8080, violations: [] });
    expect(parse(" 1 ")).toEqual({ value: 1, violations: [] });
    expect(parse("65535").violations).toEqual([]);
  });

  it.each(["abc", "15m", "12.5", "1e3", "0x10", "--1", "NaN", "Infinity", "9007199254740993"])(
    "rejects non-integer %j",
    (raw) => {
      const { value, violations } = parse(raw);
      expect(violations).toEqual(["[config] API_PORT must be an integer between 1 and 65535"]);
      expect(value).toBe(4000);
    },
  );

  it("rejects negative, zero and out-of-range values", () => {
    expect(parse("-5").violations).toHaveLength(1);
    expect(parse("0").violations).toHaveLength(1);
    expect(parse("65536").violations).toHaveLength(1);
  });

  it("supports open-ended bounds", () => {
    expect(parse("999", { min: 1000 }, 60000).violations).toEqual(["[config] API_PORT must be an integer at least 1000"]);
    expect(parse("1000", { min: 1000 }, 60000).value).toBe(1000);
  });

  it("never includes the offending value in the message", () => {
    expect(parse("super-secret-value").violations.join()).not.toContain("super-secret-value");
  });
});

describe("checkHttpUrl", () => {
  it("accepts http and https URLs", () => {
    const violations: string[] = [];
    checkHttpUrl("STELLAR_SERVICE_URL", "http://localhost:4100", violations);
    checkHttpUrl("STELLAR_SERVICE_URL", "https://stellar.example.com/base", violations);
    expect(violations).toEqual([]);
  });

  it.each(["localhost:4100", "not a url", "ftp://host", ""])("rejects %j without echoing it", (raw) => {
    const violations: string[] = [];
    checkHttpUrl("STELLAR_SERVICE_URL", raw, violations);
    expect(violations).toEqual(["[config] STELLAR_SERVICE_URL must be an absolute http(s) URL"]);
  });
});

describe("assertNoViolations", () => {
  it("is silent without violations and reports all of them at once", () => {
    expect(() => assertNoViolations([])).not.toThrow();
    expect(() => assertNoViolations(["[config] A must be x", "[config] B must be y"])).toThrow(
      "[config] A must be x\n[config] B must be y",
    );
  });
});
