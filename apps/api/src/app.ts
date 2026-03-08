import express from 'express';
import cors from 'cors';
import { config } from '@lumen/config';
import { connectDB } from './config/db';
import { startPaymentVerificationWorker } from './modules/payments/worker';
import { patientRoutes } from './modules/patients/patients.controller';
import { patientHistoryRoutes } from './modules/patients/history.controller';
import { encounterRoutes } from './modules/encounters/encounters.controller';
import { auditRoutes } from './modules/audit/audit.controller';
import { auditMiddleware } from './middlewares/audit.middleware';
import { requireActiveSubscription } from './middlewares/subscription.middleware';
import { authRoutes } from './modules/auth/auth.controller';
import { clinicOnboardingRoutes } from './modules/clinics/onboarding.controller';
import { clinicSettingsRoutes } from './modules/clinics/settings.controller';
import { paymentRoutes } from './modules/payments/payments.controller';
import { aiRoutes } from './modules/ai/stream.controller';
import { diagnosisRoutes } from './modules/diagnoses/diagnoses.controller';
import { queueRoutes } from './modules/queue/queue.controller';
import { userRoutes } from './modules/users/users.controller';
import { notesRoutes } from './modules/notes/notes.controller';
import { vitalsRoutes } from './modules/vitals/vitals.controller';
import { startCdsWorker } from './modules/ai/cds.worker';

const app = express();

app.use(cors());
app.use(express.json());
app.use(auditMiddleware);
app.use(requireActiveSubscription);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clinics', clinicOnboardingRoutes);
app.use('/api/v1/clinics', clinicSettingsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1', diagnosisRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/patients', patientHistoryRoutes);
app.use('/api/v1/vitals', vitalsRoutes);
app.use('/api/v1/encounters', encounterRoutes);
app.use('/api/v1/notes', notesRoutes);
app.use('/api/v1/audit-logs', auditRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const start = async () => {
  await connectDB();
  startPaymentVerificationWorker();
  startCdsWorker();

  app.listen(config.port, () => {
    console.log(`🚀 API running on http://localhost:${config.port}`);
  });
};

void start();
