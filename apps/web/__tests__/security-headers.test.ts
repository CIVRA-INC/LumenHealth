import { describe, expect, it } from "vitest";
import { buildCspHeader, originOf, securityHeaders } from "../lib/security-headers";

describe("buildCspHeader", () => {
  it("uses a nonce-only script-src with no unsafe-inline", () => {
    const csp = buildCspHeader({ nonce: "abc123" });
    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    // the unsafe-inline carve-out exists only for styles (Next.js injects
    // inline <style> tags) — never inside script-src
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
  });

  it("denies framing via frame-ancestors", () => {
    expect(buildCspHeader({ nonce: "n" })).toContain("frame-ancestors 'none'");
  });

  it("keeps object-src and base-uri locked down", () => {
    const csp = buildCspHeader({ nonce: "n" });
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("adds extra connect-src origins alongside 'self'", () => {
    const csp = buildCspHeader({ nonce: "n", connectSrc: ["https://api.example.com"] });
    expect(csp).toContain("connect-src 'self' https://api.example.com");
  });
});

describe("securityHeaders", () => {
  it("sets the enforcing CSP header by default", () => {
    const headers = securityHeaders({ nonce: "n" });
    expect(headers["Content-Security-Policy"]).toBeDefined();
    expect(headers["Content-Security-Policy-Report-Only"]).toBeUndefined();
  });

  it("switches to report-only for the rollout phase, with report-uri", () => {
    const headers = securityHeaders({ nonce: "n", reportOnly: true });
    expect(headers["Content-Security-Policy-Report-Only"]).toContain("report-uri /csp-report");
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });

  it("sets referrer, permissions, nosniff and framing headers", () => {
    const headers = securityHeaders({ nonce: "n" });
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("omits HSTS by default and includes it when asked", () => {
    expect(securityHeaders({ nonce: "n" })["Strict-Transport-Security"]).toBeUndefined();
    const withHsts = securityHeaders({ nonce: "n", hsts: true });
    expect(withHsts["Strict-Transport-Security"]).toContain("max-age=");
    expect(withHsts["Strict-Transport-Security"]).toContain("includeSubDomains");
  });
});

describe("originOf", () => {
  it("extracts the origin from a valid URL", () => {
    expect(originOf("https://api.example.com:8443/base")).toBe("https://api.example.com:8443");
  });

  it("returns null for unparseable input", () => {
    expect(originOf("not a url")).toBeNull();
  });
});
