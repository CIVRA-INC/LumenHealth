import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import type { Express, Request, Response } from 'express';
import { resolveAuthContext } from '../middleware/auth-context.js';
import { requireClinicScope } from '../middleware/clinic-scope.js';
import { accessTokenSigner } from '../../modules/auth/services/token.service.js';
import { identityStore } from '../../modules/auth/repositories/identity.repository.js';
import { _resetAuthStateForTests } from '../../modules/auth/controllers/auth.controller.js';
import { buildTwoClinicFixture } from '../../modules/auth/tests/fixtures.js';

function buildTestApp(): Express {
  const app = express();
  app.use(express.json());

  app.get(
    '/clinics/:clinicId',
    resolveAuthContext,
    requireClinicScope('clinicId'),
    (_req: Request, res: Response) => {
      res.json({ ok: true });
    },
  );

  app.get('/staff', resolveAuthContext, (req: Request, res: Response) => {
    res.json({ clinicId: req.auth?.clinicId });
  });

  app.get('/me', resolveAuthContext, (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  return app;
}

async function request(
  app: Express,
  method: 'GET' | 'POST',
  path: string,
  headers?: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  const { createServer } = await import('http');
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
      })
        .then(async (res) => {
          const body = await res.json();
          server.close();
          resolve({ status: res.status, body });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe('clinic isolation — requireClinicScope middleware', () => {
  const app = buildTestApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
  });

  it('allows access when clinicId in URL matches the JWT clinicId', async () => {
    const { a } = buildTwoClinicFixture();
    const { status } = await request(app, 'GET', `/clinics/${a.clinicId}`, {
      Authorization: `Bearer ${a.token}`,
    });
    expect(status).toBe(200);
  });

  it('blocks access when clinicId in URL belongs to a different clinic — returns 403', async () => {
    const { a, b } = buildTwoClinicFixture();

    const { status, body } = await request(
      app,
      'GET',
      `/clinics/${a.clinicId}`,
      {
        Authorization: `Bearer ${b.token}`,
      },
    );
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe('AUTH_FORBIDDEN');
  });

  it('passes through when no clinicId URL param is present (staff route)', async () => {
    const { a } = buildTwoClinicFixture();
    const { status, body } = await request(app, 'GET', '/staff', {
      Authorization: `Bearer ${a.token}`,
    });
    expect(status).toBe(200);

    expect((body as { clinicId: string }).clinicId).toBe(a.clinicId);
  });

  it("staff route with Token B returns Token B's clinicId — not Clinic A's data", async () => {
    const { a, b } = buildTwoClinicFixture();
    const { body: bodyA } = await request(app, 'GET', '/staff', {
      Authorization: `Bearer ${a.token}`,
    });
    const { body: bodyB } = await request(app, 'GET', '/staff', {
      Authorization: `Bearer ${b.token}`,
    });
    expect((bodyA as { clinicId: string }).clinicId).toBe(a.clinicId);
    expect((bodyB as { clinicId: string }).clinicId).toBe(b.clinicId);
    expect((bodyA as { clinicId: string }).clinicId).not.toBe(
      (bodyB as { clinicId: string }).clinicId,
    );
  });
});

describe('resolveAuthContext — clinicId enforcement', () => {
  const app = buildTestApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
  });

  it('rejects a token that has no clinicId — returns 401', async () => {
    const tokenWithoutClinic = accessTokenSigner.sign({
      sub: 'user-no-clinic',
      clinicId: '',
      role: 'owner',
    });
    const { status, body } = await request(app, 'GET', '/me', {
      Authorization: `Bearer ${tokenWithoutClinic}`,
    });
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe('AUTH_TOKEN_INVALID');
  });

  it('accepts a valid token that includes a clinicId', async () => {
    const { a } = buildTwoClinicFixture();
    const { status } = await request(app, 'GET', '/me', {
      Authorization: `Bearer ${a.token}`,
    });
    expect(status).toBe(200);
  });

  it('rejects a request with no Authorization header', async () => {
    const { status } = await request(app, 'GET', '/me');
    expect(status).toBe(401);
  });
});
