import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './helpers';

// Rate limiting is off for the other suites; this one turns it on before the application module loads.
vi.hoisted(() => {
  process.env.RATE_LIMIT_ENABLED = 'true';
});

let app: NestExpressApplication;
beforeAll(async () => {
  app = await createApp();
});
afterAll(async () => {
  await app.close();
});

describe('invitation endpoint rate limits', () => {
  it('throttles token guessing on accept', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 14; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .send({ token: `${'a'.repeat(40)}${i}`, password: 'Whatever-Password-1' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 410)).toBe(true);
    expect(statuses.slice(10)).toContain(429);
  });

  it('throttles inspection too', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 24; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/inspect')
        .send({ token: `${'b'.repeat(40)}${i}` });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
