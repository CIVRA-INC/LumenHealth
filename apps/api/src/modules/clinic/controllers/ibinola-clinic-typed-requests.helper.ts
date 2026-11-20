import type { CreateClinicRequest, UpdateClinicRequest } from "@lumen/types";

export type IbinolaCreateClinicBody = CreateClinicRequest;
export type IbinolaUpdateClinicBody = UpdateClinicRequest;

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function ibinolaToTypedCreateClinicRequest(body: unknown): IbinolaCreateClinicBody {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = asNonEmptyString(b.name);
  const address = asNonEmptyString(b.address);
  const phone = asNonEmptyString(b.phone);
  const email = asNonEmptyString(b.email);
  if (!name || !address || !phone || !email) {
    throw new Error("CLINIC_INVALID_INPUT");
  }
  return { name, address, phone, email };
}

export function ibinolaToTypedUpdateClinicRequest(body: unknown): IbinolaUpdateClinicBody {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: IbinolaUpdateClinicBody = {};
  if (typeof b.name === "string") out.name = b.name;
  if (typeof b.address === "string") out.address = b.address;
  if (typeof b.phone === "string") out.phone = b.phone;
  if (typeof b.email === "string") out.email = b.email;
  return out;
}
