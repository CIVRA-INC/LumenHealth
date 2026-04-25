import { describe, expect, it, vi } from 'vitest';
import {
  nullByteGuard,
  queryLengthGuard,
  bodySizeGuard,
  registrationAbuseGuard,
} from '../src/middlewares/anti-abuse.middleware';
import type { Request, Response, NextFunction } from 'express';

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({
    url: '/api/v1/test',
    method: 'GET',
    ip: '127.0.0.1',
    headers: {},
    ...overrides,
  } as unknown as Request);

const makeRes = () => {
  const res = {
    _status: 200,
    _body: null as unknown,
    status: vi.fn().mockImplementation(function (this: ReturnType<typeof makeRes>, code: number) {
      this._status = code;
      return this;
    }),
    json: vi.fn().mockImplementation(function (this: ReturnType<typeof makeRes>, body: unknown) {
      this._body = body;
      return this;
    }),
  };
  res.status = res.status.bind(res);
  res.json = res.json.bind(res);
  return res as unknown as Response & { _status: number; _body: unknown };
};

describe('CHORD-027 anti-abuse middleware', () => {
  describe('nullByteGuard', () => {
    it('passes clean URLs', () => {
      const next = vi.fn() as unknown as NextFunction;
      nullByteGuard(makeReq({ url: '/api/v1/patients' }), makeRes(), next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('blocks URLs with null bytes', () => {
      const next = vi.fn() as unknown as NextFunction;
      const res = makeRes();
      nullByteGuard(makeReq({ url: '/api/v1/patients\0evil' }), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
    });
  });

  describe('queryLengthGuard', () => {
    it('passes short query strings', () => {
      const next = vi.fn() as unknown as NextFunction;
      queryLengthGuard(makeReq({ url: '/api/v1/patients?name=John' }), makeRes(), next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('blocks oversized query strings', () => {
      const next = vi.fn() as unknown as NextFunction;
      const res = makeRes();
      const longQuery = 'a'.repeat(3000);
      queryLengthGuard(makeReq({ url: `/api/v1/patients?q=${longQuery}` }), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
    });
  });

  describe('bodySizeGuard', () => {
    it('passes GET requests regardless of content-length', () => {
      const next = vi.fn() as unknown as NextFunction;
      bodySizeGuard(
        makeReq({ method: 'GET', headers: { 'content-length': '9999999' } }),
        makeRes(),
        next,
      );
      expect(next).toHaveBeenCalledOnce();
    });

    it('passes POST with acceptable body size', () => {
      const next = vi.fn() as unknown as NextFunction;
      bodySizeGuard(
        makeReq({ method: 'POST', headers: { 'content-length': '512' } }),
        makeRes(),
        next,
      );
      expect(next).toHaveBeenCalledOnce();
    });

    it('blocks POST with oversized body', () => {
      const next = vi.fn() as unknown as NextFunction;
      const res = makeRes();
      bodySizeGuard(
        makeReq({ method: 'POST', headers: { 'content-length': '2000000' } }),
        res,
        next,
      );
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(413);
    });
  });

  describe('registrationAbuseGuard', () => {
    it('allows registrations under the threshold', () => {
      const next = vi.fn() as unknown as NextFunction;
      // Use a unique IP to avoid state from other tests
      const req = makeReq({ ip: '192.168.99.1', method: 'POST' });
      registrationAbuseGuard(req, makeRes(), next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('blocks excessive registrations from the same IP', () => {
      const ip = '192.168.99.2';
      const next = vi.fn() as unknown as NextFunction;

      // Exhaust the limit (5 per hour)
      for (let i = 0; i < 5; i++) {
        registrationAbuseGuard(makeReq({ ip, method: 'POST' }), makeRes(), next);
      }

      const res = makeRes();
      registrationAbuseGuard(makeReq({ ip, method: 'POST' }), res, next);
      expect(res._status).toBe(429);
    });
  });
});
