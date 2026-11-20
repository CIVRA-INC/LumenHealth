export type IntBounds = { min: number; max?: number };

const STRICT_INT = /^-?\d+$/;

/**
 * Parses a strict base-10 integer setting. Empty/missing values use `fallback`; anything else
 * must be an integer inside `bounds`. A violation is recorded (never thrown here, so every bad
 * setting is reported together) and `fallback` is returned so the caller can keep going.
 *
 * Messages carry only the variable name and the allowed range, never the offending value.
 */
export function parseIntSetting(
  name: string,
  raw: string | undefined,
  fallback: number,
  bounds: IntBounds,
  violations: string[],
): number {
  const text = raw?.trim();
  if (!text) return fallback;

  const value = STRICT_INT.test(text) ? Number(text) : Number.NaN;
  if (!Number.isSafeInteger(value) || value < bounds.min || (bounds.max !== undefined && value > bounds.max)) {
    const range = bounds.max === undefined ? `at least ${bounds.min}` : `between ${bounds.min} and ${bounds.max}`;
    violations.push(`[config] ${name} must be an integer ${range}`);
    return fallback;
  }
  return value;
}

/** Records a violation unless `raw` is an absolute http(s) URL. The value is never echoed. */
export function checkHttpUrl(name: string, raw: string, violations: string[]): void {
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") return;
  } catch {
    // fall through
  }
  violations.push(`[config] ${name} must be an absolute http(s) URL`);
}

/** Throws one error listing every recorded violation, or does nothing when there are none. */
export function assertNoViolations(violations: readonly string[]): void {
  if (violations.length > 0) {
    throw new Error(violations.join("\n"));
  }
}
