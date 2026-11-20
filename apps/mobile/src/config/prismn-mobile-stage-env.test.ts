import { describe, expect, it } from "vitest";
import {
  buildPrismnMobileEnvConfig,
  getPrismnProfileDefaults,
  normalizeApiBaseUrl,
} from "./prismn-mobile-stage-env";

describe("prismn mobile stage env config", () => {
  it("produces distinct apiBaseUrl values for profiles/stages", () => {
    const dev = buildPrismnMobileEnvConfig(getPrismnProfileDefaults("development"));
    const stg = buildPrismnMobileEnvConfig(getPrismnProfileDefaults("preview"));
    const prod = buildPrismnMobileEnvConfig(getPrismnProfileDefaults("production"));
    expect(dev.apiBaseUrl).not.toBe(stg.apiBaseUrl);
    expect(stg.apiBaseUrl).not.toBe(prod.apiBaseUrl);
    expect(prod.showStageBadge).toBe(false);
    expect(stg.showStageBadge).toBe(true);
  });

  it("fails fast on missing or invalid values and normalizes trailing slash", () => {
    expect(() => buildPrismnMobileEnvConfig({ STAGE: "production" })).toThrow("API_BASE_URL is required");
    expect(() => buildPrismnMobileEnvConfig({ STAGE: "production", API_BASE_URL: "localhost" })).toThrow("absolute http");
    expect(normalizeApiBaseUrl("https://api.example.com///")).toBe("https://api.example.com");
  });
});
