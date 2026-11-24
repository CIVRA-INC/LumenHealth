import { displayName, type PatientDetail, type PatientSummary } from '@lumen/contracts';
import type { Patient, PatientIdentifier, EmergencyContact } from '../../generated/prisma/client';

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toPatientSummary(p: Patient): PatientSummary {
  return {
    id: p.id,
    mrn: p.mrn,
    givenName: p.givenName,
    familyName: p.familyName,
    displayName: displayName(p),
    dateOfBirth: toDateOnly(p.dateOfBirth),
    sex: p.sex,
    phone: p.phone,
    registeredAt: p.createdAt.toISOString(),
  };
}

export function toPatientDetail(
  p: Patient & { identifiers: PatientIdentifier[]; emergencyContacts: EmergencyContact[] },
): PatientDetail {
  const hasAddress = p.addressLine1 || p.city || p.state;
  return {
    ...toPatientSummary(p),
    middleName: p.middleName,
    email: p.email,
    address: hasAddress
      ? {
          ...(p.addressLine1 ? { line1: p.addressLine1 } : {}),
          ...(p.city ? { city: p.city } : {}),
          ...(p.state ? { state: p.state } : {}),
          country: p.country,
        }
      : null,
    identifiers: p.identifiers.map((i) => ({ id: i.id, type: i.type, value: i.value })),
    emergencyContacts: p.emergencyContacts.map((c) => ({
      id: c.id,
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
    })),
    version: p.version,
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Lower-case, accent-free, letters only: "Ọlá-Bánjo" and "ola banjo" produce the same key. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}]/gu, '');
}

export function nameKey(givenName: string, familyName: string): string {
  return `${normalizeName(familyName)}|${normalizeName(givenName)}`;
}

export function normalizeIdentifier(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}
