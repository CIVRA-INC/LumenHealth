import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from '../src/middlewares/rate-limit.middleware';
import type { Request, Response, NextFunction } from 'express';

const makeReq = (ip = '127.0.0.1'): Request =>
  ({ ip, headers: {} } as unknown as Request);

function makeRes() {
  const state = { status: 200, body: null as unknown };
  const res = {
    setHeader: vi.fn(),
    status: vi.fn((code: number) => { state.status = code; return res; }),
    json: vi.fn((body: unknown) => { state.body = body; return res; }),
  } as unknown as Response;
  return { res, state };
}

describe('CHORD-026 rate limiting', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    const nextFn = vi.fn() as unknown as NextFunction;
    const { res } = makeRes();
    limiter(makeReq(), res, nextFn);
    expect(nextFn).toHaveBeenCalledOnce();
  });

  it('blocks requests over the limit with 429', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const req = makeReq('10.0.0.1');
    const nextFn = vi.fn() as unknown as NextFunction;

    // exhaust limit
    limiter(req, makeRes().res, nextFn);
    limiter(req, makeRes().res, nextFn);

    // 3rd call should be blocked
    const { res, state } = makeRes();
    limiter(req, res, nextFn);
    expect(state.status).toBe(429);
  });

  it('sets X-RateLimit headers', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
    const req = makeReq('10.0.0.2');
    const { res } = makeRes();
    const nextFn = vi.fn() as unknown as NextFunction;

    limiter(req, res, nextFn);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
  });

  it('uses custom keyFn', () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      keyFn: (req) => (req as unknown as { user: string }).user,
    });

    const req1 = { user: 'alice', ip: '1.1.1.1', headers: {} } as unknown as Request;
    const req2 = { user: 'bob', ip: '1.1.1.1', headers: {} } as unknown as Request;
    const nextFn = vi.fn() as unknown as NextFunction;

    limiter(req1, makeRes().res, nextFn); // alice: 1st — allowed
    limiter(req1, makeRes().res, nextFn); // alice: 2nd — blocked
    limiter(req2, makeRes().res, nextFn); // bob: 1st — allowed

    expect(nextFn).toHaveBeenCalledTimes(2); // alice(1) + bob(1)
  });
});
