export interface AbdulrcrtwCrashContext {
  clinicId?: string;
  role?: string;
  route?: string;
  appVersion?: string;
  [key: string]: unknown;
}

const REDACTED = "[REDACTED]";
const PHI_PATTERNS: RegExp[] = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g,
  /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/g,
];

export function scrubString(input: string): string {
  let out = input;
  for (const re of PHI_PATTERNS) out = out.replace(re, REDACTED);
  return out;
}

export function scrubCrashContext(ctx: AbdulrcrtwCrashContext): Record<string, unknown> {
  const allowedKeys = new Set(["clinicId", "role", "route", "appVersion", "platform", "build"]);
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (!allowedKeys.has(k)) continue;
    if (typeof v === "string") safe[k] = scrubString(v);
    else safe[k] = v;
  }
  return safe;
}

export function scrubErrorForReporting(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return { name: err.name || "Error", message: scrubString(err.message || ""), stack: err.stack ? scrubString(err.stack) : undefined };
  }
  return { name: "Error", message: scrubString(String(err)) };
}
