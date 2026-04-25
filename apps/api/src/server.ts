/**
 * CHORD-021 – Transport startup layer.
 *
 * Responsibilities:
 *  - Connect to the database
 *  - Start background workers (feature-flag gated)
 *  - Bind the HTTP server to a port
 *
 * The Express app itself is assembled in app.factory.ts so it can be imported
 * by tests without opening a socket or touching the database.
 */
import { config } from '@lumen/config';
import { logger } from './core/logger';
import { connectDB } from './config/db';
import { createApp } from './app.factory';
import { startPaymentVerificationWorker } from './modules/payments/worker';
import { startCdsWorker } from './modules/ai/cds.worker';

export const startServer = async () => {
  await connectDB();

  if (config.featureFlags.stellarBilling) {
    startPaymentVerificationWorker();
  }

  if (config.featureFlags.aiSummaries) {
    startCdsWorker();
  }

  const app = createApp();

  return new Promise<void>((resolve) => {
    app.listen(config.port, () => {
      logger.info('api server started', { port: config.port });
      resolve();
    });
  });
};
