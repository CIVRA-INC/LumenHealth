import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPatient,
  getPatient,
  updatePatient,
  listPatients,
  deletePatient,
  patientDemographicsStore,
} from '../services/patient-demographics.service';

const CLINIC_A = 'clinic_a';
const CLINIC_B = 'clinic_b';

const validPatientData = {
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-06-15',
  gender: 'female' as const,
  bloodType: 'O+',
  phone: '+1-555-0199',
  email: 'jane.doe@example.com',
  emergencyContact: {
    name: 'John Doe',
    relationship: 'Spouse',
    phoneNumber: '+1-555-0100',
  },
};

describe('patient demographics service', () => {
  beforeEach(() => {
    patientDemographicsStore._reset();
  });

  describe('createPatient', () => {
    it('creates a patient with all fields', () => {
      const patient = createPatient(validPatientData, CLINIC_A);

      expect(patient.patientId).toMatch(/^pat_/);
      expect(patient.clinicId).toBe(CLINIC_A);
      expect(patient.firstName).toBe('Jane');
      expect(patient.lastName).toBe('Doe');
      expect(patient.gender).toBe('female');
      expect(patient.bloodType).toBe('O+');
      expect(patient.email).toBe('jane.doe@example.com');
      expect(patient.emergencyContact.name).toBe('John Doe');
      expect(patient.createdAt).toBeDefined();
      expect(patient.updatedAt).toBeDefined();
    });

    it('creates a patient with minimal required fields', () => {
      const minimal = {
        firstName: 'Bob',
        lastName: 'Smith',
        dateOfBirth: '1985-03-10',
        gender: 'male' as const,
        emergencyContact: validPatientData.emergencyContact,
      };
      const patient = createPatient(minimal, CLINIC_A);

      expect(patient.firstName).toBe('Bob');
      expect(patient.bloodType).toBeUndefined();
      expect(patient.email).toBeUndefined();
    });

    it('normalises email to lowercase', () => {
      const data = {
        ...validPatientData,
        email: 'Jane.Doe@Example.COM',
      };
      const patient = createPatient(data, CLINIC_A);
      expect(patient.email).toBe('jane.doe@example.com');
    });

    it('trims whitespace from names', () => {
      const data = {
        ...validPatientData,
        firstName: '  Jane  ',
        lastName: '  Doe  ',
      };
      const patient = createPatient(data, CLINIC_A);
      expect(patient.firstName).toBe('Jane');
      expect(patient.lastName).toBe('Doe');
    });

    it('throws on invalid data', () => {
      expect(() => createPatient({} as any, CLINIC_A)).toThrow();
    });

    it('throws when firstName is missing', () => {
      const { firstName, ...rest } = validPatientData;
      expect(() => createPatient(rest as any, CLINIC_A)).toThrow();
    });
  });

  describe('getPatient', () => {
    it('returns patient within same clinic', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      const found = getPatient(created.patientId, CLINIC_A);

      expect(found).not.toBeNull();
      expect(found?.patientId).toBe(created.patientId);
    });

    it('returns null for cross-clinic access', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      const found = getPatient(created.patientId, CLINIC_B);

      expect(found).toBeNull();
    });

    it('returns null for non-existent patient', () => {
      const found = getPatient('non_existent', CLINIC_A);
      expect(found).toBeNull();
    });

    it('returns null for soft-deleted patient', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      deletePatient(created.patientId, CLINIC_A);
      const found = getPatient(created.patientId, CLINIC_A);

      expect(found).toBeNull();
    });
  });

  describe('updatePatient', () => {
    it('updates firstName', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      const updated = updatePatient(created.patientId, { firstName: 'Updated' }, CLINIC_A);

      expect(updated?.firstName).toBe('Updated');
      expect(updated?.lastName).toBe('Doe');
    });

    it('updates gender', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      const updated = updatePatient(created.patientId, { gender: 'non_binary' }, CLINIC_A);

      expect(updated?.gender).toBe('non_binary');
    });

    it('updates multiple fields at once', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      const updated = updatePatient(
        created.patientId,
        { firstName: 'New', lastName: 'Name' },
        CLINIC_A,
      );

      expect(updated?.firstName).toBe('New');
      expect(updated?.lastName).toBe('Name');
    });

    it('bumps updatedAt timestamp', async () => {
      const created = createPatient(validPatientData, CLINIC_A);
      await new Promise((r) => setTimeout(r, 10));
      const updated = updatePatient(created.patientId, { firstName: 'X' }, CLINIC_A);

      expect(updated!.updatedAt >= created.updatedAt).toBe(true);
    });

    it('returns null for cross-clinic update', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      const updated = updatePatient(created.patientId, { firstName: 'Hacked' }, CLINIC_B);

      expect(updated).toBeNull();
    });

    it('returns null for non-existent patient', () => {
      const updated = updatePatient('non_existent', { firstName: 'X' }, CLINIC_A);
      expect(updated).toBeNull();
    });

    it('throws on invalid update data', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      expect(() => updatePatient(created.patientId, { gender: 'bad' as any }, CLINIC_A)).toThrow();
    });
  });

  describe('listPatients', () => {
    it('returns all patients for a clinic', () => {
      createPatient(validPatientData, CLINIC_A);
      createPatient({ ...validPatientData, firstName: 'Bob', gender: 'male' }, CLINIC_A);

      const result = listPatients(CLINIC_A);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta?.total).toBe(2);
    });

    it('returns empty list for clinic with no patients', () => {
      const result = listPatients(CLINIC_A);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('filters by gender', () => {
      createPatient(validPatientData, CLINIC_A);
      createPatient({ ...validPatientData, firstName: 'Bob', gender: 'male' }, CLINIC_A);

      const result = listPatients(CLINIC_A, { gender: 'male' });
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.firstName).toBe('Bob');
    });

    it('searches by name', () => {
      createPatient(validPatientData, CLINIC_A);
      createPatient({ ...validPatientData, firstName: 'Bob', lastName: 'Jones', gender: 'male', email: 'bob@example.com' }, CLINIC_A);

      const result = listPatients(CLINIC_A, { search: 'jane' });
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.firstName).toBe('Jane');
    });

    it('searches by email', () => {
      createPatient(validPatientData, CLINIC_A);

      const result = listPatients(CLINIC_A, { search: 'jane.doe@example' });
      expect(result.data).toHaveLength(1);
    });

    it('paginates results', () => {
      for (let i = 0; i < 5; i++) {
        createPatient({ ...validPatientData, firstName: `Patient${i}` }, CLINIC_A);
      }

      const page1 = listPatients(CLINIC_A, { page: 1, limit: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.meta?.total).toBe(5);
      expect(page1.meta?.page).toBe(1);

      const page2 = listPatients(CLINIC_A, { page: 2, limit: 2 });
      expect(page2.data).toHaveLength(2);

      const page3 = listPatients(CLINIC_A, { page: 3, limit: 2 });
      expect(page3.data).toHaveLength(1);
    });

    it('excludes patients from other clinics', () => {
      createPatient(validPatientData, CLINIC_A);
      createPatient({ ...validPatientData, firstName: 'Other' }, CLINIC_B);

      const result = listPatients(CLINIC_A);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.firstName).toBe('Jane');
    });

    it('excludes soft-deleted patients', () => {
      const p = createPatient(validPatientData, CLINIC_A);
      deletePatient(p.patientId, CLINIC_A);

      const result = listPatients(CLINIC_A);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('deletePatient', () => {
    it('soft-deletes a patient', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      const deleted = deletePatient(created.patientId, CLINIC_A);

      expect(deleted?.deletedAt).toBeDefined();
      expect(deleted?.patientId).toBe(created.patientId);
    });

    it('patient is no longer retrievable after delete', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      deletePatient(created.patientId, CLINIC_A);

      const found = getPatient(created.patientId, CLINIC_A);
      expect(found).toBeNull();
    });

    it('returns null for cross-clinic delete', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      const result = deletePatient(created.patientId, CLINIC_B);
      expect(result).toBeNull();
    });

    it('returns null for non-existent patient', () => {
      const result = deletePatient('non_existent', CLINIC_A);
      expect(result).toBeNull();
    });

    it('patient still exists in store (soft delete)', () => {
      const created = createPatient(validPatientData, CLINIC_A);
      deletePatient(created.patientId, CLINIC_A);

      const raw = patientDemographicsStore.findById(created.patientId);
      expect(raw).toBeDefined();
      expect(raw?.deletedAt).toBeDefined();
    });
  });

  describe('clinic isolation', () => {
    it('patients in clinic A are invisible to clinic B', () => {
      createPatient(validPatientData, CLINIC_A);
      createPatient({ ...validPatientData, firstName: 'Bob' }, CLINIC_B);

      const listA = listPatients(CLINIC_A);
      const listB = listPatients(CLINIC_B);

      expect(listA.data).toHaveLength(1);
      expect(listA.data?.[0]?.firstName).toBe('Jane');
      expect(listB.data).toHaveLength(1);
      expect(listB.data?.[0]?.firstName).toBe('Bob');
    });

    it('update in one clinic does not affect another', () => {
      const p = createPatient(validPatientData, CLINIC_A);
      updatePatient(p.patientId, { firstName: 'Changed' }, CLINIC_A);
      const fromB = getPatient(p.patientId, CLINIC_B);

      expect(fromB).toBeNull();
    });
  });
});
