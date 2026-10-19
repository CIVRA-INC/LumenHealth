import { describe, expect, it, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import middleware, { config } from "../middleware";

/**
 * #1344: the middleware sets a fresh per-response nonce, applies the security
 * headers, and forwards the nonce + CSP on the request so Next.js can nonce
 * its own inline bootstrap scripts.
 */
function run(url = "http://localhost/") {
  return middleware(new NextRequest(url)) as ReturnType<typeof middleware>;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("security middleware (#1344)", () => {
  it("sets an enforcing CSP with a nonce on the response", () => {
    vi.stubEnv("CSP_REPORT_ONLY", "");
    const nonce = /nonce-([^']+)'/.exec(run().headers.get("Content-Security-Policy") ?? "")?.[1];
    expect(nonce).toBeTruthy();
    expect(run().headers.get("Content-Security-Policy")).toContain("script-src 'self' 'nonce-");
  });

  it("generates a fresh nonce per response", () => {
    const first = run().headers.get("Content-Security-Policy");
    const second = run().headers.get("Content-Security-Policy");
    expect(first).not.toBe(second);
  });

  it("sets the common security headers", () => {
    const response = run();
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("emits report-only CSP when CSP_REPORT_ONLY=1", () => {
    vi.stubEnv("CSP_REPORT_ONLY", "1");
    const response = run();
    expect(response.headers.get("Content-Security-Policy-Report-Only")).toContain("report-uri /csp-report");
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });

  it("omits HSTS outside production and includes it in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(run().headers.get("Strict-Transport-Security")).toBeNull();
    vi.stubEnv("NODE_ENV", "production");
    expect(run().headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("forwards the nonce and CSP on the request headers so Next.js can nonce its own scripts", () => {
    vi.stubEnv("CSP_REPORT_ONLY", "");
    const response = run();
    // Next.js encodes request-header overrides like this on the middleware
    // response.
    const overrides = response.headers.get("x-middleware-override-headers") ?? "";
    expect(overrides).toContain("x-nonce");
    expect(overrides).toContain("content-security-policy");

    const forwardedNonce = response.headers.get("x-middleware-request-x-nonce");
    const cspNonce = /nonce-([^']+)'/.exec(response.headers.get("Content-Security-Policy") ?? "")?.[1];
    expect(forwardedNonce).toBeTruthy();
    expect(cspNonce).toBe(forwardedNonce);
  });

  it("does not run for static asset requests", () => {
    expect(config.matcher.join("")).toContain("_next/static");
  });
});
