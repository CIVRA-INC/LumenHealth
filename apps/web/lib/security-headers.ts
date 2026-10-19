/**
 * Security header construction for the web app (#1344).
 *
 * Kept as pure functions (no Next.js runtime imports) so the exact header
 * values are unit-testable and so the same logic can be reused from
 * middleware and from tooling.
 */

export type SecurityHeaderOptions = {
  /** Per-request CSP nonce for script elements. */
  nonce: string;
  /**
   * Emit `Content-Security-Policy-Report-Only` instead of the enforcing
   * header — used for the report-only rollout phase so violations are
   * logged (via `/csp-report`) before blocking anything.
   */
  reportOnly?: boolean;
  /**
   * Extra origins allowed in `connect-src` (e.g. the API origin from
   * `NEXT_PUBLIC_API_BASE_URL`). Defaults to none beyond 'self'.
   */
  connectSrc?: readonly string[];
  /** Emit HSTS. Off by default for plain-HTTP local development. */
  hsts?: boolean;
};

/** Origins from a URL that are valid CSP source expressions. */
export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Builds the Content-Security-Policy header value.
 *
 * - `script-src` is nonce-only ('self' + nonce): no 'unsafe-inline', so any
 *   injected inline script is blocked; the check-inline-scripts test and the
 *   CI step keep our own markup honest.
 * - `style-src` allows 'unsafe-inline' because Next.js injects inline
 *   <style> tags for app-router styling; scripts get no such carve-out.
 * - `frame-ancestors 'none'` (plus legacy X-Frame-Options: DENY) blocks
 *   framing — no clickjacking surface.
 */
export function buildCspHeader(options: SecurityHeaderOptions): string {
  const connectSrc = ["'self'", ...(options.connectSrc ?? [])].join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${options.nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export const CSP_REPORT_URI = "/csp-report";

/**
 * The full per-response security header set: nonce-based CSP (report-only
 * during rollout), referrer and permissions policies, HSTS, MIME sniffing
 * protection, and the legacy framing guard.
 */
export function securityHeaders(options: SecurityHeaderOptions): Record<string, string> {
  const csp = buildCspHeader(options);
  const headers: Record<string, string> = {
    [options.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy"]:
      `${csp}; report-uri ${CSP_REPORT_URI}`,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  if (options.hsts) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains";
  }
  return headers;
}
