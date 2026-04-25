import mongoose from 'mongoose';
import type { Server } from 'http';

const SHUTDOWN_TIMEOUT_MS = 10_000;

export function setupGracefulShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[shutdown] Received ${signal}. Starting graceful shutdown...`);

    const forceExit = setTimeout(() => {
      console.error('[shutdown] Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async (err) => {
      if (err) {
        console.error('[shutdown] Error closing HTTP server:', err);
      } else {
        console.log('[shutdown] HTTP server closed.');
      }

      try {
        await mongoose.disconnect();
        console.log('[shutdown] MongoDB disconnected.');
      } catch (dbErr) {
        console.error('[shutdown] Error disconnecting MongoDB:', dbErr);
      }

      clearTimeout(forceExit);
      console.log('[shutdown] Graceful shutdown complete.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}
