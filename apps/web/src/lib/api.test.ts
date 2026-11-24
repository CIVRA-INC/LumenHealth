import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setUnauthenticatedHandler } from './api';

function respond(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthenticatedHandler(() => undefined);
});

describe('api client', () => {
  it('returns parsed JSON on success and sends credentials same-origin', async () => {
    respond(200, { ok: true });
    await expect(api.get('/ping', { q: 'a b', skip: undefined })).resolves.toEqual({ ok: true });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/api/v1/ping?q=a+b');
    expect(init?.credentials).toBe('same-origin');
  });

  it('turns the error envelope into an ApiError with field messages', async () => {
    respond(400, {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Bad',
        details: { fields: [{ path: 'phone', message: 'Enter a valid phone number' }] },
      },
    });
    const error = await api.post('/patients', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('VALIDATION_FAILED');
    expect((error as ApiError).fieldErrors).toEqual({ phone: 'Enter a valid phone number' });
  });

  it('notifies the app when a request finds the session gone', async () => {
    const handler = vi.fn();
    setUnauthenticatedHandler(handler);
    respond(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } });
    await expect(api.get('/dashboard')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not treat a failed sign-in as an expired session', async () => {
    const handler = vi.fn();
    setUnauthenticatedHandler(handler);
    respond(401, { error: { code: 'UNAUTHENTICATED', message: 'Incorrect email or password' } });
    await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it('reports network failures in plain language', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});
