import type { AuthIdentity } from "../types/index.js";
import { clinicStore } from "../../clinic/repositories/clinic.repository.js";

export type ClinicAccessError = {
  status: 403;
  body: { error: "AUTH_FORBIDDEN"; message: string };
};

export function checkClinicAccess(clinicId: string): ClinicAccessError | null {
  const clinic = clinicStore.findById(clinicId);
  if (!clinic) return null;
  if (clinic.status === "archived") {
    return { status: 403, body: { error: "AUTH_FORBIDDEN", message: "clinic is archived" } };
  }
  if (clinic.status === "suspended") {
    return { status: 403, body: { error: "AUTH_FORBIDDEN", message: "clinic is suspended" } };
  }
  return null;
}

export function canOwnerReadArchivedClinic(identity: Pick<AuthIdentity, "role">, method: string, path: string): boolean {
  return identity.role === "owner" && method.toUpperCase() === "GET" && /^\/api\/v1\/clinics\/[^/]+\/?$/.test(path);
}
