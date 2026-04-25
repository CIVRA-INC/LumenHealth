import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  ApiProblem,
  conflictProblem,
  databaseProblem,
  domainProblem,
  forbiddenProblem,
  internalProblem,
  invalidHeadersProblem,
  notFoundProblem,
  serviceUnavailableProblem,
  subscriptionExpiredProblem,
  toApiProblem,
  tokenExpiredProblem,
  tokenInvalidProblem,
  unauthorizedProblem,
  upstreamProblem,
  validationProblem,
} from '../src/core/problem';

describe('error taxonomy (CHORD-023)', () => {
  it('unauthorizedProblem → 401 UNAUTHORIZED', () => {
    const p = unauthorizedProblem();
    expect(p.statusCode).toBe(401);
    expect(p.code).toBe('UNAUTHORIZED');
    expect(p.expose).toBe(true);
  });

  it('tokenExpiredProblem → 401 TOKEN_EXPIRED', () => {
    const p = tokenExpiredProblem();
    expect(p.statusCode).toBe(401);
    expect(p.code).toBe('TOKEN_EXPIRED');
  });

  it('tokenInvalidProblem → 401 TOKEN_INVALID', () => {
    const p = tokenInvalidProblem();
    expect(p.statusCode).toBe(401);
    expect(p.code).toBe('TOKEN_INVALID');
  });

  it('forbiddenProblem → 403 FORBIDDEN', () => {
    const p = forbiddenProblem();
    expect(p.statusCode).toBe(403);
    expect(p.code).toBe('FORBIDDEN');
  });

  it('notFoundProblem → 404 NOT_FOUND', () => {
    const p = notFoundProblem();
    expect(p.statusCode).toBe(404);
    expect(p.code).toBe('NOT_FOUND');
  });

  it('conflictProblem → 409 CONFLICT', () => {
    const p = conflictProblem();
    expect(p.statusCode).toBe(409);
    expect(p.code).toBe('CONFLICT');
  });

  it('invalidHeadersProblem → 400 INVALID_HEADERS', () => {
    const p = invalidHeadersProblem();
    expect(p.statusCode).toBe(400);
    expect(p.code).toBe('INVALID_HEADERS');
  });

  it('subscriptionExpiredProblem → 402 SUBSCRIPTION_EXPIRED', () => {
    const p = subscriptionExpiredProblem();
    expect(p.statusCode).toBe(402);
    expect(p.code).toBe('SUBSCRIPTION_EXPIRED');
  });

  it('domainProblem → 422 DOMAIN_ERROR with details', () => {
    const p = domainProblem('encounter already closed', { encounterId: 'e1' });
    expect(p.statusCode).toBe(422);
    expect(p.code).toBe('DOMAIN_ERROR');
    expect(p.details).toEqual({ encounterId: 'e1' });
  });

  it('internalProblem → 500 INTERNAL_ERROR, not exposed', () => {
    const p = internalProblem();
    expect(p.statusCode).toBe(500);
    expect(p.code).toBe('INTERNAL_ERROR');
    expect(p.expose).toBe(false);
  });

  it('databaseProblem → 500 DATABASE_ERROR, not exposed', () => {
    const p = databaseProblem();
    expect(p.statusCode).toBe(500);
    expect(p.expose).toBe(false);
  });

  it('serviceUnavailableProblem → 503 SERVICE_UNAVAILABLE', () => {
    const p = serviceUnavailableProblem();
    expect(p.statusCode).toBe(503);
  });

  it('upstreamProblem → 502 UPSTREAM_ERROR', () => {
    const p = upstreamProblem();
    expect(p.statusCode).toBe(502);
  });

  it('validationProblem maps ZodError issues', () => {
    const zodErr = new ZodError([
      { code: 'too_small', path: ['age'], message: 'too small', minimum: 0, type: 'number', inclusive: true },
    ]);
    const p = validationProblem(zodErr);
    expect(p.statusCode).toBe(400);
    expect(p.code).toBe('VALIDATION_ERROR');
    const details = p.details as Array<{ field: string; message: string }>;
    expect(details[0]!.field).toBe('age');
  });

  describe('toApiProblem mapper', () => {
    it('passes through ApiProblem unchanged', () => {
      const original = notFoundProblem('patient missing');
      expect(toApiProblem(original)).toBe(original);
    });

    it('maps ZodError to VALIDATION_ERROR', () => {
      const zodErr = new ZodError([
        { code: 'invalid_type', path: ['name'], message: 'required', expected: 'string', received: 'undefined' },
      ]);
      const p = toApiProblem(zodErr);
      expect(p.code).toBe('VALIDATION_ERROR');
    });

    it('maps unknown errors to INTERNAL_ERROR', () => {
      const p = toApiProblem(new Error('db exploded'));
      expect(p.code).toBe('INTERNAL_ERROR');
      expect(p.expose).toBe(false);
    });

    it('maps non-Error throws to INTERNAL_ERROR', () => {
      const p = toApiProblem('string error');
      expect(p.code).toBe('INTERNAL_ERROR');
    });
  });
});
