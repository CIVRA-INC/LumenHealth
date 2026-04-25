import { describe, expect, it, vi } from 'vitest';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../src/middlewares/validate.middleware';

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides,
  }) as unknown as Request;

const makeRes = () => ({} as Response);
const makeNext = () => vi.fn() as unknown as NextFunction;

describe('validateRequest middleware (CHORD-024)', () => {
  it('passes through when all schemas match', async () => {
    const next = makeNext();
    const middleware = validateRequest({
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.string().optional() }),
      params: z.object({ id: z.string() }),
    });

    const req = makeReq({ body: { name: 'Ada' }, params: { id: '123' } });
    await middleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with VALIDATION_ERROR on body failure', async () => {
    const next = makeNext();
    const middleware = validateRequest({
      body: z.object({ name: z.string() }),
    });

    const req = makeReq({ body: { name: 42 } });
    await middleware(req, makeRes(), next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { code: string };
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('calls next with VALIDATION_ERROR on query failure', async () => {
    const next = makeNext();
    const middleware = validateRequest({
      query: z.object({ limit: z.string().regex(/^\d+$/, 'must be numeric') }),
    });

    const req = makeReq({ query: { limit: 'abc' } });
    await middleware(req, makeRes(), next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { code: string };
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('calls next with VALIDATION_ERROR on params failure', async () => {
    const next = makeNext();
    const middleware = validateRequest({
      params: z.object({ id: z.string().uuid() }),
    });

    const req = makeReq({ params: { id: 'not-a-uuid' } });
    await middleware(req, makeRes(), next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { code: string };
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('calls next with INVALID_HEADERS on headers failure', async () => {
    const next = makeNext();
    const middleware = validateRequest({
      headers: z.object({ 'x-clinic-id': z.string().min(1) }),
    });

    const req = makeReq({ headers: {} });
    await middleware(req, makeRes(), next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { code: string };
    expect(err.code).toBe('INVALID_HEADERS');
  });

  it('passes when headers schema is satisfied', async () => {
    const next = makeNext();
    const middleware = validateRequest({
      headers: z.object({ 'x-clinic-id': z.string().min(1) }),
    });

    const req = makeReq({ headers: { 'x-clinic-id': 'clinic-001' } });
    await middleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('mutates req.body with parsed value', async () => {
    const next = makeNext();
    const middleware = validateRequest({
      body: z.object({ count: z.coerce.number() }),
    });

    const req = makeReq({ body: { count: '5' } });
    await middleware(req, makeRes(), next);

    expect((req.body as { count: number }).count).toBe(5);
    expect(next).toHaveBeenCalledWith();
  });
});
