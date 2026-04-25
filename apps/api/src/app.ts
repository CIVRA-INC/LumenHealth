/**
 * Entry point – delegates all startup logic to server.ts.
 * Keep this file minimal so the process boundary is easy to trace.
 */
import { startServer } from './server';
import { logger } from './core/logger';

void startServer().catch((err: unknown) => {
  logger.error('fatal startup error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
