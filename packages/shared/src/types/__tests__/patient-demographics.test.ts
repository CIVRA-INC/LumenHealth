import { describe, it, expect } from 'vitest';
import {
  createPatientSchema,
  updatePatientSchema,
  patientListQuerySchema,
  genderCategorySchema,
  emergencyContactSchema,
} from '../../validation/patient-demographics.schemas';

const validEmergencyContact = {
  name: 'John Doe',
  relationship: 'Spouse',
  phoneNumber: '+1-555-0100',
};

const validCreatePatient = {
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-06-15',
  gender: 'female' as const,
  bloodType: 'O+',
  phone: '+1-555-0199',
  email: 'jane.doe@example.com',
  emergencyContact: validEmergencyContact,
};

describe('patient demographics schemas', () => {
  describe('genderCategorySchema', () => {
    it('accepts valid gender values', () => {
      expect(genderCategorySchema.parse('male')).toBe('male');
      expect(genderCategorySchema.parse('female')).toBe('female');
      expect(genderCategorySchema.parse('non_binary')).toBe('non_binary');
      expect(genderCategorySchema.parse('other')).toBe('other');
      expect(genderCategorySchema.parse('prefer_not_to_say')).toBe('prefer_not_to_say');
    });

    it('rejects invalid gender values', () => {
      expect(() => genderCategorySchema.parse('invalid')).toThrow();
      expect(() => genderCategorySchema.parse('')).toThrow();
    });
  });

  describe('emergencyContactSchema', () => {
    it('accepts valid emergency contact', () => {
      const result = emergencyContactSchema.parse(validEmergencyContact);
      expect(result.name).toBe('John Doe');
    });

    it('rejects empty name', () => {
      expect(() => emergencyContactSchema.parse({ ...validEmergencyContact, name: '' })).toThrow();
    });

    it('rejects empty relationship', () => {
      expect(() => emergencyContactSchema.parse({ ...validEmergencyContact, relationship: '' })).toThrow();
    });

    it('rejects short phone number', () => {
      expect(() => emergencyContactSchema.parse({ ...validEmergencyContact, phoneNumber: '123' })).toThrow();
    });
  });

  describe('createPatientSchema', () => {
    it('accepts valid patient data', () => {
      const result = createPatientSchema.parse(validCreatePatient);
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Doe');
      expect(result.gender).toBe('female');
    });

    it('accepts minimal required fields', () => {
      const minimal = {
        firstName: 'Bob',
        lastName: 'Smith',
        dateOfBirth: '1985-03-10',
        gender: 'male' as const,
        emergencyContact: validEmergencyContact,
      };
      const result = createPatientSchema.parse(minimal);
      expect(result.firstName).toBe('Bob');
      expect(result.bloodType).toBeUndefined();
      expect(result.email).toBeUndefined();
    });

    it('rejects missing firstName', () => {
      const { firstName, ...rest } = validCreatePatient;
      expect(() => createPatientSchema.parse(rest)).toThrow();
    });

    it('rejects missing lastName', () => {
      const { lastName, ...rest } = validCreatePatient;
      expect(() => createPatientSchema.parse(rest)).toThrow();
    });

    it('rejects missing dateOfBirth', () => {
      const { dateOfBirth, ...rest } = validCreatePatient;
      expect(() => createPatientSchema.parse(rest)).toThrow();
    });

    it('rejects missing gender', () => {
      const { gender, ...rest } = validCreatePatient;
      expect(() => createPatientSchema.parse(rest)).toThrow();
    });

    it('rejects missing emergencyContact', () => {
      const { emergencyContact, ...rest } = validCreatePatient;
      expect(() => createPatientSchema.parse(rest)).toThrow();
    });

    it('rejects invalid email format', () => {
      expect(() => createPatientSchema.parse({ ...validCreatePatient, email: 'not-an-email' })).toThrow();
    });

    it('rejects empty firstName', () => {
      expect(() => createPatientSchema.parse({ ...validCreatePatient, firstName: '' })).toThrow();
    });

    it('rejects empty lastName', () => {
      expect(() => createPatientSchema.parse({ ...validCreatePatient, lastName: '' })).toThrow();
    });
  });

  describe('updatePatientSchema', () => {
    it('accepts partial updates', () => {
      const result = updatePatientSchema.parse({ firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
    });

    it('accepts empty object (no-op update)', () => {
      const result = updatePatientSchema.parse({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('accepts all fields', () => {
      const result = updatePatientSchema.parse({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1990-06-15',
        gender: 'female',
        emergencyContact: validEmergencyContact,
      });
      expect(result.firstName).toBe('Jane');
    });

    it('rejects invalid gender', () => {
      expect(() => updatePatientSchema.parse({ gender: 'invalid' })).toThrow();
    });

    it('rejects invalid email', () => {
      expect(() => updatePatientSchema.parse({ email: 'bad-email' })).toThrow();
    });
  });

  describe('patientListQuerySchema', () => {
    it('accepts valid query params', () => {
      const result = patientListQuerySchema.parse({ search: 'Jane', gender: 'female', page: 1, limit: 10 });
      expect(result.search).toBe('Jane');
      expect(result.gender).toBe('female');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('applies defaults for missing page and limit', () => {
      const result = patientListQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('coerces string numbers to integers', () => {
      const result = patientListQuerySchema.parse({ page: '2', limit: '50' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('rejects limit exceeding 100', () => {
      expect(() => patientListQuerySchema.parse({ limit: 101 })).toThrow();
    });

    it('rejects page less than 1', () => {
      expect(() => patientListQuerySchema.parse({ page: 0 })).toThrow();
    });
  });
});
