import type {
  PatientDemographics,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientListQuery,
  PatientDemographicsResponse,
} from '@qyou/shared';
import {
  createPatientSchema,
  updatePatientSchema,
  patientListQuerySchema,
} from '@qyou/shared';

const store = new Map<string, PatientDemographics>();

export const patientDemographicsStore = {
  save(patient: PatientDemographics): PatientDemographics {
    store.set(patient.patientId, patient);
    return patient;
  },

  findById(patientId: string): PatientDemographics | undefined {
    return store.get(patientId);
  },

  list(): PatientDemographics[] {
    return Array.from(store.values());
  },

  _reset(): void {
    store.clear();
  },
};

function generateId(): string {
  return `pat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createPatient(
  data: CreatePatientRequest,
  clinicId: string,
): PatientDemographics {
  const validated = createPatientSchema.parse(data);
  const now = new Date().toISOString();

  const patient: PatientDemographics = {
    patientId: generateId(),
    clinicId,
    firstName: validated.firstName.trim(),
    lastName: validated.lastName.trim(),
    dateOfBirth: validated.dateOfBirth,
    gender: validated.gender,
    bloodType: validated.bloodType,
    phone: validated.phone,
    email: validated.email?.trim().toLowerCase(),
    address: validated.address,
    emergencyContact: {
      name: validated.emergencyContact.name.trim(),
      relationship: validated.emergencyContact.relationship.trim(),
      phoneNumber: validated.emergencyContact.phoneNumber.trim(),
    },
    createdAt: now,
    updatedAt: now,
  };

  return patientDemographicsStore.save(patient);
}

export function getPatient(
  patientId: string,
  clinicId: string,
): PatientDemographics | null {
  const patient = patientDemographicsStore.findById(patientId);
  if (!patient || patient.clinicId !== clinicId) return null;
  if (patient.deletedAt) return null;
  return patient;
}

export function updatePatient(
  patientId: string,
  data: UpdatePatientRequest,
  clinicId: string,
): PatientDemographics | null {
  const patient = getPatient(patientId, clinicId);
  if (!patient) return null;

  const validated = updatePatientSchema.parse(data);
  const now = new Date().toISOString();

  const updated: PatientDemographics = {
    ...patient,
    ...(validated.firstName !== undefined ? { firstName: validated.firstName.trim() } : {}),
    ...(validated.lastName !== undefined ? { lastName: validated.lastName.trim() } : {}),
    ...(validated.dateOfBirth !== undefined ? { dateOfBirth: validated.dateOfBirth } : {}),
    ...(validated.gender !== undefined ? { gender: validated.gender } : {}),
    ...(validated.bloodType !== undefined ? { bloodType: validated.bloodType } : {}),
    ...(validated.phone !== undefined ? { phone: validated.phone } : {}),
    ...(validated.email !== undefined ? { email: validated.email?.trim().toLowerCase() } : {}),
    ...(validated.address !== undefined ? { address: validated.address } : {}),
    ...(validated.emergencyContact !== undefined
      ? {
          emergencyContact: {
            name: validated.emergencyContact.name.trim(),
            relationship: validated.emergencyContact.relationship.trim(),
            phoneNumber: validated.emergencyContact.phoneNumber.trim(),
          },
        }
      : {}),
    updatedAt: now,
  };

  return patientDemographicsStore.save(updated);
}

export function listPatients(
  clinicId: string,
  query: PatientListQuery = {},
): PatientDemographicsResponse {
  const validated = patientListQuerySchema.parse(query);
  let patients = patientDemographicsStore.list().filter(
    (p) => p.clinicId === clinicId && !p.deletedAt,
  );

  if (validated.gender) {
    patients = patients.filter((p) => p.gender === validated.gender);
  }

  if (validated.search) {
    const term = validated.search.toLowerCase();
    patients = patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term),
    );
  }

  const total = patients.length;
  const offset = (validated.page - 1) * validated.limit;
  const paginated = patients.slice(offset, offset + validated.limit);

  return {
    success: true,
    data: paginated,
    meta: { total, page: validated.page, limit: validated.limit },
  };
}

export function deletePatient(
  patientId: string,
  clinicId: string,
): PatientDemographics | null {
  const patient = getPatient(patientId, clinicId);
  if (!patient) return null;

  const archived: PatientDemographics = {
    ...patient,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return patientDemographicsStore.save(archived);
}
