/** Substrings that mark a value as copied from `.env.example` or otherwise a placeholder. */
const PLACEHOLDER_MARKERS = ["change-me", "changeme", "<generate", "replace-me", "your-secret"];

export type SecretRules = {
  /** Minimum length enforced in production. Omit to enforce only the placeholder check. */
  minLength?: number;
};

export type SecretAssessment = { ok: true } | { ok: false; problem: string };

/** Judges a secret without ever including its value in the result. */
export function assessSecret(name: string, value: string, rules: SecretRules = {}): SecretAssessment {
  const lowered = value.toLowerCase();
  if (PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker))) {
    return { ok: false, problem: `${name} is still a placeholder value (for example copied from .env.example)` };
  }
  if (rules.minLength !== undefined && value.length < rules.minLength) {
    return { ok: false, problem: `${name} must be at least ${rules.minLength} characters` };
  }
  return { ok: true };
}

const warned = new Set<string>();

/**
 * In production a weak or placeholder secret is a startup error; elsewhere it logs one warning
 * per variable. Returns `value` unchanged so it can wrap a `read(...)` call. The error and the
 * warning name the variable and the problem only, never the secret.
 */
export function enforceSecret(
  name: string,
  value: string,
  rules: SecretRules = {},
  env: Record<string, string | undefined> = process.env,
  warn: (message: string) => void = (message) => console.warn(message),
): string {
  const assessment = assessSecret(name, value, rules);
  if (assessment.ok) return value;

  if (env.NODE_ENV === "production") {
    throw new Error(`[config] ${assessment.problem}; generate one with: openssl rand -base64 48`);
  }
  if (!warned.has(name)) {
    warned.add(name);
    warn(`[config] ${assessment.problem}. This is tolerated outside production only.`);
  }
  return value;
}

/** Test helper: forget which variables have already warned. */
export function resetSecretWarnings(): void {
  warned.clear();
}
