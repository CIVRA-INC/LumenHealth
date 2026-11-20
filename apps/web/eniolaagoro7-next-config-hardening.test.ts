import { describe, expect, it, afterEach } from "vitest";
import { buildEniolaagoro7HardenedNextConfig, validateEniolaagoro7RequiredPublicEnv } from "./eniolaagoro7-next-config-hardening";

const prev = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
  else process.env.NEXT_PUBLIC_API_BASE_URL = prev;
});

describe("eniolaagoro7 next.config hardening", () => {
  it("validates required public env vars", () => {
    expect(validateEniolaagoro7RequiredPublicEnv({})).toEqual({ ok: false, missing: ["NEXT_PUBLIC_API_BASE_URL"] });
    expect(validateEniolaagoro7RequiredPublicEnv({ NEXT_PUBLIC_API_BASE_URL: "http://x" })).toEqual({ ok: true });
  });

  it("disables x-powered-by and fails build-time when required env missing", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    expect(buildEniolaagoro7HardenedNextConfig({ reactStrictMode: true })).toMatchObject({ poweredByHeader: false, reactStrictMode: true });
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    expect(() => buildEniolaagoro7HardenedNextConfig({})).toThrow(/Missing required public env/);
  });
});
