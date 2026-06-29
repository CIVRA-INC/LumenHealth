import type { ConsentType, GrantConsentRequest } from "@lumen/types";

const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "data_processing",
  "sharing",
  "research",
  "communications",
]);

type ValidationResult =
  | { ok: true }
  | { ok: false; field: string; message: string };

export function validateGrantConsent(body: unknown): ValidationResult {
  const b = (body ?? {}) as Partial<GrantConsentRequest> as Record<
    string,
    unknown
  >;

  if (!b.type || typeof b.type !== "string" || !ALLOWED_TYPES.has(b.type)) {
    return {
      ok: false,
      field: "type",
      message:
        "type must be one of data_processing | sharing | research | communications",
    };
  }

  if (!Array.isArray(b.scope)) {
    return {
      ok: false,
      field: "scope",
      message: "scope must be an array of strings",
    };
  }

  for (const s of b.scope) {
    if (typeof s !== "string" || s.trim().length === 0) {
      return {
        ok: false,
        field: "scope",
        message: "each scope entry must be a non-empty string",
      };
    }
  }

  return { ok: true };
}
