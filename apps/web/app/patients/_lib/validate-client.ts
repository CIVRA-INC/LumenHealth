// Mirrors the server-side contract in
// apps/api/src/modules/patient/validators/patient.validator.ts so the form
// can surface inline errors instantly without round-tripping to the API.
// Authoritative validation still lives on the server; this layer is
// UX-only.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME_LEN = 120;
const MAX_ADDR_LEN = 240;
const MIN_PHONE_LEN = 5;
const MAX_PHONE_LEN = 32;

export type ClientValidationResult =
  | { ok: true }
  | { ok: false; field: string; message: string };

function requireString(
  values: Record<string, string>,
  field: string,
  min: number,
  max: number,
): ClientValidationResult | null {
  const v = values[field];
  if (v === undefined || v === null || String(v).trim() === "") {
    return { ok: false, field, message: `${field} is required` };
  }
  const trimmed = String(v).trim();
  if (trimmed.length < min) {
    return {
      ok: false,
      field,
      message: `${field} must be at least ${min} characters`,
    };
  }
  if (trimmed.length > max) {
    return {
      ok: false,
      field,
      message: `${field} must be ${max} characters or fewer`,
    };
  }
  return null;
}

export function validateCreateForm(
  values: Record<string, string>,
): ClientValidationResult {
  let err: ClientValidationResult | null;
  err = requireString(values, "identifier", 1, MAX_ADDR_LEN);
  if (err) return err;
  err = requireString(values, "givenName", 1, MAX_NAME_LEN);
  if (err) return err;
  err = requireString(values, "familyName", 1, MAX_NAME_LEN);
  if (err) return err;
  err = requireString(values, "address", 1, MAX_ADDR_LEN);
  if (err) return err;

  const birthDate = values.birthDate;
  if (!birthDate || !ISO_DATE_RE.test(birthDate.trim())) {
    return {
      ok: false,
      field: "birthDate",
      message: "birthDate must be an ISO-8601 date (YYYY-MM-DD)",
    };
  }

  err = requireString(values, "phone", MIN_PHONE_LEN, MAX_PHONE_LEN);
  if (err) return err;

  const email = values.email;
  if (!email || !EMAIL_RE.test(email.trim())) {
    return { ok: false, field: "email", message: "a valid email is required" };
  }

  return { ok: true };
}

const STATUS_VALUES = new Set(["active", "inactive", "archived"]);

function optionalString(
  values: Record<string, string>,
  field: string,
  min: number,
  max: number,
): ClientValidationResult | null {
  const v = values[field];
  if (v === undefined || String(v).trim() === "") return null;
  const trimmed = String(v).trim();
  if (trimmed.length < min) {
    return {
      ok: false,
      field,
      message: `${field} must be at least ${min} characters`,
    };
  }
  if (trimmed.length > max) {
    return {
      ok: false,
      field,
      message: `${field} must be ${max} characters or fewer`,
    };
  }
  return null;
}

export function validateUpdateForm(
  values: Record<string, string>,
): ClientValidationResult {
  let err: ClientValidationResult | null;
  err = optionalString(values, "givenName", 1, MAX_NAME_LEN);
  if (err) return err;
  err = optionalString(values, "familyName", 1, MAX_NAME_LEN);
  if (err) return err;
  err = optionalString(values, "phone", MIN_PHONE_LEN, MAX_PHONE_LEN);
  if (err) return err;
  err = optionalString(values, "address", 1, MAX_ADDR_LEN);
  if (err) return err;

  const email = values.email;
  if (email !== undefined && email !== "") {
    if (!EMAIL_RE.test(email.trim())) {
      return {
        ok: false,
        field: "email",
        message: "a valid email is required",
      };
    }
  }

  const status = values.status;
  if (status !== undefined && status !== "" && !STATUS_VALUES.has(status)) {
    return {
      ok: false,
      field: "status",
      message: "status must be one of active|inactive|archived",
    };
  }

  return { ok: true };
}
