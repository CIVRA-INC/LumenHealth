import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicRuntimeConfig } from "@lumen/config/public";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicRuntimeConfig", () => {
  it("falls back to localhost outside production when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getPublicRuntimeConfig().apiBaseUrl).toBe("http://localhost:4000");
  });

  it("treats a whitespace-only value as unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "   ");
    vi.stubEnv("NODE_ENV", "development");
    expect(getPublicRuntimeConfig().apiBaseUrl).toBe("http://localhost:4000");
  });

  it("strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com//");
    expect(getPublicRuntimeConfig().apiBaseUrl).toBe("https://api.example.com");
  });

  it("rejects values that are not http(s) URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "api.example.com");
    expect(() => getPublicRuntimeConfig()).toThrow(/not a valid URL/);
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "ftp://api.example.com");
    expect(() => getPublicRuntimeConfig()).toThrow(/http or https/);
  });

  it("throws a clear error naming the variable in production when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getPublicRuntimeConfig()).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });
});
