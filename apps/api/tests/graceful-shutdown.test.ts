import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupGracefulShutdown } from '../src/shutdown';

describe('CHORD-025 graceful shutdown', () => {
  let processOnSpy: ReturnType<typeof vi.spyOn>;
  const handlers: Record<string, (...args: unknown[]) => void> = {};

  beforeEach(() => {
    processOnSpy = vi.spyOn(process, 'on').mockImplementation((event, handler) => {
      handlers[event as string] = handler as (...args: unknown[]) => void;
      return process;
    });
  });

  afterEach(() => {
    processOnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('registers SIGTERM and SIGINT handlers', () => {
    const fakeServer = { close: vi.fn() } as unknown as import('http').Server;
    setupGracefulShutdown(fakeServer);

    expect(handlers['SIGTERM']).toBeDefined();
    expect(handlers['SIGINT']).toBeDefined();
  });

  it('calls server.close on SIGTERM', () => {
    const fakeServer = { close: vi.fn() } as unknown as import('http').Server;
    setupGracefulShutdown(fakeServer);

    handlers['SIGTERM']?.();

    expect(fakeServer.close).toHaveBeenCalledOnce();
  });

  it('does not call server.close twice when signal fires multiple times', () => {
    const fakeServer = { close: vi.fn() } as unknown as import('http').Server;
    setupGracefulShutdown(fakeServer);

    handlers['SIGTERM']?.();
    handlers['SIGTERM']?.();

    expect(fakeServer.close).toHaveBeenCalledOnce();
  });
});
