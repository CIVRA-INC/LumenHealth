/**
 * CSP violation report endpoint (#1344).
 *
 * Both the legacy `Content-Security-Policy-Report-Only` report-uri payloads
 * (`{"csp-report": {...}}`) and the newer Reporting API shape
 * (`[{ "type": "csp-violation", ... }]`) are accepted and normalized, then
 * logged so staging shows what the report-only rollout is catching before
 * the enforcing policy goes on. Deliberately unauthenticated — browsers
 * post to it — and it discards everything it can't parse.
 */

type CspViolation = {
  "document-uri"?: string;
  "violated-directive"?: string;
  "blocked-uri"?: string;
  "source-file"?: string;
  "line-number"?: number;
  "original-policy"?: string;
};

function normalizeViolation(value: unknown): CspViolation | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const pick = (key: string): string | undefined =>
    typeof v[key] === "string" ? (v[key] as string) : undefined;
  const lineNumber = typeof v["line-number"] === "number" ? v["line-number"] : undefined;
  const violation: CspViolation = {
    "document-uri": pick("document-uri"),
    "violated-directive": pick("violated-directive"),
    "blocked-uri": pick("blocked-uri"),
    "source-file": pick("source-file"),
    "line-number": lineNumber,
    "original-policy": pick("original-policy"),
  };
  return violation["violated-directive"] ? violation : null;
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const violations: CspViolation[] = [];
  if (Array.isArray(payload)) {
    // Reporting API batch: [{ type: "csp-violation", ...fields }]
    for (const item of payload) {
      const violation = normalizeViolation(item);
      if (violation) violations.push(violation);
    }
  } else if (payload && typeof payload === "object") {
    const legacy = (payload as Record<string, unknown>)["csp-report"];
    const violation = normalizeViolation(legacy);
    if (violation) violations.push(violation);
  }

  for (const violation of violations) {
    // Staging signal for the report-only rollout: which directive broke,
    // on which document, from which source.
    console.warn(
      `[csp-report] ${violation["violated-directive"]} blocked ${violation["blocked-uri"] ?? "unknown"} on ${violation["document-uri"] ?? "unknown"}${violation["line-number"] !== undefined ? ` (line ${violation["line-number"]})` : ""}`
    );
  }

  // 204 either way — reporters must never retry or surface errors.
  return new Response(null, { status: 204 });
}
