import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('logger (CHORD-022)', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits valid JSON to stdout for info level', async () => {
    const { logger } = await import('../src/core/logger');
    logger.info('test message', { requestId: 'req-1', userId: 'user-1' });

    expect(stdoutSpy).toHaveBeenCalledOnce();
    const raw = stdoutSpy.mock.calls[0]![0] as string;
    const entry = JSON.parse(raw.trim()) as Record<string, unknown>;

    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
    expect(entry.requestId).toBe('req-1');
    expect(entry.userId).toBe('user-1');
    expect(typeof entry.timestamp).toBe('string');
  });

  it('emits to stderr for error level', async () => {
    const { logger } = await import('../src/core/logger');
    logger.error('something broke');

    expect(stderrSpy).toHaveBeenCalledOnce();
    const raw = stderrSpy.mock.calls[0]![0] as string;
    const entry = JSON.parse(raw.trim()) as Record<string, unknown>;
    expect(entry.level).toBe('error');
  });

  it('child logger merges context fields', async () => {
    const { logger } = await import('../src/core/logger');
    const child = logger.child({ requestId: 'child-req', service: 'test' });
    child.info('child message', { extra: 'data' });

    const raw = stdoutSpy.mock.calls[0]![0] as string;
    const entry = JSON.parse(raw.trim()) as Record<string, unknown>;
    expect(entry.requestId).toBe('child-req');
    expect(entry.service).toBe('test');
    expect(entry.extra).toBe('data');
    expect(entry.message).toBe('child message');
  });

  it('suppresses debug logs when LOG_LEVEL is info', async () => {
    process.env['LOG_LEVEL'] = 'info';
    const { logger } = await import('../src/core/logger');
    logger.debug('should be suppressed');
    expect(stdoutSpy).not.toHaveBeenCalled();
    delete process.env['LOG_LEVEL'];
  });
});
