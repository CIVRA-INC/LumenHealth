import { config } from '@lumen/config';
import { connectDB } from './config/db';
import { createApp } from './app.factory';
import { startPaymentVerificationWorker } from './modules/payments/worker';
import { startCdsWorker } from './modules/ai/cds.worker';
const app = createApp();

const start = async () => {
  await connectDB();
  if (config.featureFlags.stellarBilling) {
    startPaymentVerificationWorker();
  }
  if (config.featureFlags.aiSummaries) {
    startCdsWorker();
  }

  app.listen(config.port, () => {
    console.log(`🚀 API running on http://localhost:${config.port}`);
  });
};

void start();
