import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock mongoose before importing the health controller
vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mongoose')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      connection: {
        readyState: 1,
        db: {
          admin: () => ({ ping: vi.fn().mockResolvedValue({ ok: 1 }) }),
        },
      },
    },
  };
});

describe('CHORD-028 health endpoints', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.API_PORT = '4000';
    process.env.MONGO_URI = 'mongodb://localhost:27017/lumenhealth-test';
    process.env.JWT_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.JWT_REFRESH_TOKEN_SECRET = 'refresh-secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  async function startTestServer() {
    const express = (await import('express')).default;
    const { healthRoutes } = await import('../src/modules/health/health.controller');
    const app = express();
    app.use(healthRoutes);

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Bad address');
    const base = `http://127.0.0.1:${address.port}`;

    const stop = () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );

    return { base, stop };
  }

  it('GET /health returns 200 with status ok', async () => {
    const { base, stop } = await startTestServer();
    try {
      const res = await fetch(`${base}/health`);
      const body = (await res.json()) as { status: string; uptime: number };
      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(typeof body.uptime).toBe('number');
    } finally {
      await stop();
    }
  });

  it('GET /ready returns 200 when mongo is connected', async () => {
    const { base, stop } = await startTestServer();
    try {
      const res = await fetch(`${base}/ready`);
      const body = (await res.json()) as { status: string; dependencies: { name: string; status: string }[] };
      expect(res.status).toBe(200);
      expect(body.status).toBe('ready');
      expect(body.dependencies[0].name).toBe('mongodb');
      expect(body.dependencies[0].status).toBe('ok');
    } finally {
      await stop();
    }
  });

  it('GET /ready returns 503 when mongo is disconnected', async () => {
    vi.doMock('mongoose', async (importOriginal) => {
      const actual = await importOriginal<typeof import('mongoose')>();
      return {
        ...actual,
        default: {
          ...actual.default,
          connection: { readyState: 0, db: null },
        },
      };
    });
    vi.resetModules();

    const express = (await import('express')).default;
    const { healthRoutes } = await import('../src/modules/health/health.controller');
    const app = express();
    app.use(healthRoutes);

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const address = server.address() as import('net').AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/ready`);
      const body = (await res.json()) as { status: string };
      expect(res.status).toBe(503);
      expect(body.status).toBe('not_ready');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });

  it('GET /diagnostics returns config summary', async () => {
    const { base, stop } = await startTestServer();
    try {
      const res = await fetch(`${base}/diagnostics`);
      const body = (await res.json()) as { config: { entries: unknown[] } };
      expect(res.status).toBe(200);
      expect(Array.isArray(body.config.entries)).toBe(true);
    } finally {
      await stop();
    }
  });
});
