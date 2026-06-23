import type { UserRole } from "@lumen/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationResult =
  | { ok: true }
  | { ok: false; field: string; message: string };

const ASSIGNABLE_ROLES: Exclude<UserRole, "owner">[] = ["admin", "clinician", "cashier"];

export function validateSendInvitation(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>;

  if (!b.email || typeof b.email !== "string" || !EMAIL_RE.test(b.email)) {
    return { ok: false, field: "email", message: "a valid email is required" };
  }
  if (!b.role || !ASSIGNABLE_ROLES.includes(b.role as Exclude<UserRole, "owner">)) {
    return {
      ok: false,
      field: "role",
      message: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
    };
  }

  return { ok: true };
}

export function validateAcceptInvitation(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>;

  if (!b.token || typeof b.token !== "string" || !b.token.trim()) {
    return { ok: false, field: "token", message: "token is required" };
  }
  if (!b.name || typeof b.name !== "string" || b.name.trim().length < 2) {
    return { ok: false, field: "name", message: "name must be at least 2 characters" };
  }
  if (!b.password || typeof b.password !== "string") {
    return { ok: false, field: "password", message: "password is required" };
  }
  if (b.password.length < 8) {
    return { ok: false, field: "password", message: "password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(b.password)) {
    return { ok: false, field: "password", message: "password must contain at least one uppercase letter" };
  }
  if (!/[0-9]/.test(b.password)) {
    return { ok: false, field: "password", message: "password must contain at least one number" };
  }

  return { ok: true };
}
