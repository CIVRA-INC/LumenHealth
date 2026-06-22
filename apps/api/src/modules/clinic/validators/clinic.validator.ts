import type { CreateClinicRequest, UpdateClinicRequest } from "@lumen/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationResult =
  | { ok: true }
  | { ok: false; field: string; message: string };

export function validateCreateClinic(body: unknown): ValidationResult {
  const b = body as Partial<CreateClinicRequest>;

  if (!b.name || typeof b.name !== "string" || b.name.trim().length < 2) {
    return { ok: false, field: "name", message: "name must be at least 2 characters" };
  }
  if (b.name.trim().length > 120) {
    return { ok: false, field: "name", message: "name must be 120 characters or fewer" };
  }
  if (!b.address || typeof b.address !== "string" || !b.address.trim()) {
    return { ok: false, field: "address", message: "address is required" };
  }
  if (!b.phone || typeof b.phone !== "string" || !b.phone.trim()) {
    return { ok: false, field: "phone", message: "phone is required" };
  }
  if (!b.email || typeof b.email !== "string" || !EMAIL_RE.test(b.email)) {
    return { ok: false, field: "email", message: "a valid email is required" };
  }

  return { ok: true };
}

export function validateUpdateClinic(body: unknown): ValidationResult {
  const b = body as Partial<UpdateClinicRequest>;

  if (b.name !== undefined) {
    if (typeof b.name !== "string" || b.name.trim().length < 2) {
      return { ok: false, field: "name", message: "name must be at least 2 characters" };
    }
    if (b.name.trim().length > 120) {
      return { ok: false, field: "name", message: "name must be 120 characters or fewer" };
    }
  }
  if (b.email !== undefined && !EMAIL_RE.test(b.email)) {
    return { ok: false, field: "email", message: "a valid email is required" };
  }

  return { ok: true };
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}
