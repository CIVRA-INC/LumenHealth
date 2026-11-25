import { describe, expect, it } from 'vitest';
import { ageInYears, createPatientSchema, normalizePhone } from './patients';

describe('normalizePhone', () => {
  it('converts Nigerian national numbers to E.164', () => {
    expect(normalizePhone('0803 123 4567')).toBe('+2348031234567');
  });
  it('keeps valid international numbers', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });
  it('rejects garbage', () => {
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
  });
});

describe('ageInYears', () => {
  it('accounts for birthdays not yet reached', () => {
    expect(ageInYears('2000-06-15', new Date('2026-06-14T12:00:00Z'))).toBe(25);
    expect(ageInYears('2000-06-15', new Date('2026-06-15T12:00:00Z'))).toBe(26);
  });
});

describe('createPatientSchema', () => {
  const valid = {
    givenName: 'Amina',
    familyName: 'Bello',
    dateOfBirth: '1990-04-12',
    sex: 'FEMALE',
    phone: '08031234567',
  };
  it('normalises phone and applies defaults', () => {
    const parsed = createPatientSchema.parse(valid);
    expect(parsed.phone).toBe('+2348031234567');
    expect(parsed.identifiers).toEqual([]);
    expect(parsed.confirmNotDuplicate).toBe(false);
  });
  it('rejects a future date of birth', () => {
    const result = createPatientSchema.safeParse({ ...valid, dateOfBirth: '2999-01-01' });
    expect(result.success).toBe(false);
  });
});
