import express from 'express';
import cors from 'cors';
import { config } from '@lumen/config';
import { connectDB } from './config/db';
import { paymentRoutes } from './modules/payments/payments.controller';
import { startPaymentVerificationWorker } from './modules/payments/worker';
import { authRoutes } from './modules/auth/auth.controller';
import { clinicOnboardingRoutes } from './modules/clinics/onboarding.controller';
import { clinicSettingsRoutes } from './modules/clinics/settings.controller';
import { userRoutes } from './modules/users/users.controller';
import { requireActiveSubscription } from './middlewares/subscription.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requireActiveSubscription);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clinics', clinicOnboardingRoutes);
app.use('/api/v1/clinics', clinicSettingsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/payments', paymentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const start = async () => {
  await connectDB();
  startPaymentVerificationWorker();
  app.listen(config.port, () => {
    console.log(`🚀 API running on http://localhost:${config.port}`);
  });
};

start();
