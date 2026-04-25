import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('bootstrap layers (CHORD-021)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env['API_PORT'] = '4000';
    process.env['MONGO_URI'] = 'mongodb://localhost:27017/lumenhealth-test';
    process.env['JWT_ACCESS_TOKEN_SECRET'] = 'access-secret';
    process.env['JWT_REFRESH_TOKEN_SECRET'] = 'refresh-secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('createApp assembles express app without opening a socket', async () => {
    const { createApp } = await import('../src/app.factory');
    const app = createApp();
    expect(typeof app.listen).toBe('function');
  });

  it('startServer is exported from server.ts as a function', async () => {
    // Mock heavy dependencies to avoid Mongoose model re-registration
    vi.mock('../src/app.factory', () => ({ createApp: vi.fn(() => ({ listen: vi.fn() })) }));
    vi.mock('../src/config/db', () => ({ connectDB: vi.fn() }));
    vi.mock('../src/modules/payments/worker', () => ({ startPaymentVerificationWorker: vi.fn() }));
    vi.mock('../src/modules/ai/cds.worker', () => ({ startCdsWorker: vi.fn() }));

    const serverModule = await import('../src/server');
    expect(typeof serverModule.startServer).toBe('function');
  });
});
