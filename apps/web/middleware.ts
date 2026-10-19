import { NextResponse, type NextRequest } from "next/server";
import { originOf, securityHeaders } from "./lib/security-headers";

/**
 * Applies the per-request security headers (#1344): a fresh nonce per
 * response, nonce-based CSP (report-only while `CSP_REPORT_ONLY=1` for the
 * rollout phase), referrer/permissions policies, HSTS, and MIME-sniffing
 * protection.
 *
 * The nonce is also forwarded on `x-nonce` so server components can tag
 * their own script elements, and the CSP is set on the *request* headers as
 * well: that is how Next.js discovers the nonce and applies it to the inline
 * bootstrap scripts it renders itself (without it, an enforcing
 * `script-src 'self' 'nonce-…'` would block them).
 */
export default function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  const headers = securityHeaders({
    nonce,
    reportOnly: process.env.CSP_REPORT_ONLY === "1",
    connectSrc: apiBaseUrl ? [originOf(apiBaseUrl)].filter((o): o is string => o !== null) : [],
    // HSTS would be ignored (or worse, confusing) over plain-HTTP local
    // dev; enable it wherever the app is served over TLS.
    hsts: process.env.NODE_ENV === "production",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads the nonce off the CSP request header to nonce the inline
  // scripts it injects itself; the response header is what the browser
  // enforces.
  for (const [key, value] of Object.entries(headers)) {
    requestHeaders.set(key, value);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Everything except static assets, which get the headers from the
  // platform/CDN anyway and never need a per-response nonce.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
