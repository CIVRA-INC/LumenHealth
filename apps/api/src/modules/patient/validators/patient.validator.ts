import type {
  CreatePatientRequest,
  UpdatePatientRequest,
} from "@lumen/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME_LEN = 120;
const MAX_ADDR_LEN = 240;
const MIN_PHONE_LEN = 5;
const MAX_PHONE_LEN = 32;

type ValidationResult =
  | { ok: true }
  | { ok: false; field: string; message: string };

function requireString(
  body: Record<string, unknown>,
  field: keyof CreatePatientRequest,
  min: number,
  max: number,
): ValidationResult | null {
  const v = body[field];
  if (v === undefined || v === null) {
    return { ok: false, field, message: `${field} is required` };
  }
  if (typeof v !== "string" || v.trim().length < min) {
    return {
      ok: false,
      field,
      message: `${field} must be at least ${min} characters`,
    };
  }
  if (v.trim().length > max) {
    return {
      ok: false,
      field,
      message: `${field} must be ${max} characters or fewer`,
    };
  }
  return null;
}

export function validateCreatePatient(body: unknown): ValidationResult {
  const b = (body ?? {}) as Partial<CreatePatientRequest> as Record<
    string,
    unknown
  >;

  const ADDR_LIKE: ReadonlyArray<keyof CreatePatientRequest> = [
    "identifier",
    "address",
  ];
  const NAME_LIKE: ReadonlyArray<keyof CreatePatientRequest> = [
    "givenName",
    "familyName",
  ];

  for (const field of ADDR_LIKE) {
    const err = requireString(b, field, 1, MAX_ADDR_LEN);
    if (err) return err;
  }
  for (const field of NAME_LIKE) {
    const err = requireString(b, field, 1, MAX_NAME_LEN);
    if (err) return err;
  }

  const bd = b.birthDate;
  if (typeof bd !== "string" || !ISO_DATE_RE.test(bd)) {
    return {
      ok: false,
      field: "birthDate",
      message: "birthDate must be an ISO-8601 date (YYYY-MM-DD)",
    };
  }

  if (
    typeof b.phone !== "string" ||
    b.phone.trim().length < MIN_PHONE_LEN ||
    b.phone.trim().length > MAX_PHONE_LEN
  ) {
    return {
      ok: false,
      field: "phone",
      message: `phone must be between ${MIN_PHONE_LEN} and ${MAX_PHONE_LEN} characters`,
    };
  }

  if (typeof b.email !== "string" || !EMAIL_RE.test(b.email)) {
    return { ok: false, field: "email", message: "a valid email is required" };
  }

  return { ok: true };
}

const ALLOWED_UPDATE_FIELDS: ReadonlySet<keyof UpdatePatientRequest> = new Set([
  "givenName",
  "familyName",
  "phone",
  "email",
  "address",
  "status",
]);

const STATUS_VALUES: ReadonlySet<string> = new Set([
  "active",
  "inactive",
  "archived",
]);

function validateOptionalString(
  body: Record<string, unknown>,
  field: keyof UpdatePatientRequest,
  min: number,
  max: number,
): ValidationResult | null {
  const v = body[field];
  if (v === undefined) return null;
  if (typeof v !== "string" || v.trim().length < min) {
    return {
      ok: false,
      field,
      message: `${field} must be at least ${min} characters`,
    };
  }
  if (v.trim().length > max) {
    return {
      ok: false,
      field,
      message: `${field} must be ${max} characters or fewer`,
    };
  }
  return null;
}

export function validateUpdatePatient(body: unknown): ValidationResult {
  const b = (body ?? {}) as Partial<UpdatePatientRequest> as Record<
    string,
    unknown
  >;

  let err: ValidationResult | null;
  err = validateOptionalString(b, "givenName", 1, MAX_NAME_LEN);
  if (err) return err;
  err = validateOptionalString(b, "familyName", 1, MAX_NAME_LEN);
  if (err) return err;
  err = validateOptionalString(b, "phone", MIN_PHONE_LEN, MAX_PHONE_LEN);
  if (err) return err;
  err = validateOptionalString(b, "address", 1, MAX_ADDR_LEN);
  if (err) return err;

  if (b.email !== undefined) {
    if (typeof b.email !== "string" || !EMAIL_RE.test(b.email)) {
      return {
        ok: false,
        field: "email",
        message: "a valid email is required",
      };
    }
  }

  if (b.status !== undefined && !STATUS_VALUES.has(String(b.status))) {
    return {
      ok: false,
      field: "status",
      message: "status must be one of active|inactive|archived",
    };
  }

  for (const k of Object.keys(b)) {
    if (!ALLOWED_UPDATE_FIELDS.has(k as keyof UpdatePatientRequest)) {
      return { ok: false, field: k, message: `unknown field ${k}` };
    }
  }

  return { ok: true };
}
