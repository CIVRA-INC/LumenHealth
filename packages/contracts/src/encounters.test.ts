import { describe, expect, it } from 'vitest';
import { canTransitionAppointment } from './scheduling';
import { canTransitionEncounter, computeBmi, recordVitalsSchema } from './encounters';
import { roleHasPermission } from './permissions';

describe('state machines', () => {
  it('only allows documented encounter transitions', () => {
    expect(canTransitionEncounter('IN_PROGRESS', 'FINALIZED')).toBe(true);
    expect(canTransitionEncounter('FINALIZED', 'CLOSED')).toBe(true);
    expect(canTransitionEncounter('IN_PROGRESS', 'CLOSED')).toBe(false);
    expect(canTransitionEncounter('CLOSED', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionEncounter('FINALIZED', 'ENTERED_IN_ERROR')).toBe(false);
  });
  it('only allows documented appointment transitions', () => {
    expect(canTransitionAppointment('SCHEDULED', 'CHECKED_IN')).toBe(true);
    expect(canTransitionAppointment('SCHEDULED', 'IN_CONSULTATION')).toBe(false);
    expect(canTransitionAppointment('COMPLETED', 'CANCELLED')).toBe(false);
  });
});

describe('vitals', () => {
  it('requires at least one measurement', () => {
    expect(recordVitalsSchema.safeParse({}).success).toBe(false);
  });
  it('requires systolic to exceed diastolic', () => {
    expect(recordVitalsSchema.safeParse({ systolicBp: 80, diastolicBp: 90 }).success).toBe(false);
    expect(recordVitalsSchema.safeParse({ systolicBp: 120, diastolicBp: 80 }).success).toBe(true);
  });
  it('computes BMI', () => {
    expect(computeBmi(70, 175)).toBe(22.9);
    expect(computeBmi(null, 175)).toBeNull();
  });
});

describe('role permissions', () => {
  it('keeps administrators out of clinical records', () => {
    expect(roleHasPermission('ORG_ADMIN', 'encounters.read')).toBe(false);
    expect(roleHasPermission('CLINICIAN', 'encounters.finalize')).toBe(true);
    expect(roleHasPermission('FRONT_DESK', 'orders.prescribe')).toBe(false);
  });
});
