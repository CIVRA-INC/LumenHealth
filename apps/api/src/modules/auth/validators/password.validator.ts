export type PasswordPolicyConfig = {
  minLength: number;
  requireUpper: boolean;
  requireNumber: boolean;
};

export const defaultPasswordPolicy: PasswordPolicyConfig = {
  minLength: 8,
  requireUpper: false,
  requireNumber: false,
};

export function validatePassword(
  password: string,
  cfg: PasswordPolicyConfig = defaultPasswordPolicy
): string | null {
  if (password.length < cfg.minLength) return `password must be at least ${cfg.minLength} characters`;
  if (cfg.requireUpper && !/[A-Z]/.test(password)) return "password must include an uppercase letter";
  if (cfg.requireNumber && !/[0-9]/.test(password)) return "password must include a number";
  return null;
}

/** Lowercase and strip everything but a–z/0–9, so "Test-Clinic!" and "testclinic" compare equal. */
function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * True when `password` is trivially derived from one of `identifiers` (the
 * email local-part, the clinic name, etc.): identical after normalization, or
 * the password is itself just a fragment of an identifier. A password that
 * merely *starts with* an identifier but adds real entropy (e.g. "OwnerPass1!"
 * for owner@x) is intentionally NOT rejected — only genuinely guessable
 * derivations are. See issue #1031.
 */
export function passwordResemblesIdentifier(
  password: string,
  identifiers: (string | undefined)[]
): boolean {
  const pwd = normalizeForComparison(password);
  if (pwd.length < 4) return false;

  for (const identifier of identifiers) {
    if (!identifier) continue;
    const id = normalizeForComparison(identifier);
    if (id.length < 4) continue;
    // Exact match, or the password is nothing more than a slice of the
    // identifier (an even weaker secret than the public identifier itself).
    if (pwd === id) return true;
    if (id.includes(pwd)) return true;
  }
  return false;
}
