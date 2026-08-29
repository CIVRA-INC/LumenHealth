export type PasswordPolicyConfig = {
  minLength: number;
  requireUpper: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
};

export const defaultPasswordPolicy: PasswordPolicyConfig = {
  minLength: 8,
  requireUpper: true,
  requireNumber: true,
  requireSymbol: true,
};

export function validatePassword(
  password: string,
  cfg: PasswordPolicyConfig = defaultPasswordPolicy
): string | null {
  if (password.length < cfg.minLength) return `password must be at least ${cfg.minLength} characters`;
  if (cfg.requireUpper && !/[A-Z]/.test(password)) return "password must include an uppercase letter";
  if (cfg.requireNumber && !/[0-9]/.test(password)) return "password must include a number";
  if (cfg.requireSymbol && !/[a-zA-Z0-9]/.test(password)) return "password must include a special character";
  return null;
}
