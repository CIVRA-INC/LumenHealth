import cors from 'cors';
import express, { Express } from 'express';
import { config, getConfigDiagnostics } from '@lumen/config';
import { auditMiddleware } from './middlewares/audit.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { requestContextMiddleware } from './middlewares/request-context.middleware';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware';
import { requireActiveSubscription } from './middlewares/subscription.middleware';
import { aiDraftRoutes } from './modules/ai/drafts.controller';
import { aiRoutes } from './modules/ai/stream.controller';
import { auditRoutes } from './modules/audit/audit.controller';
import { authRoutes } from './modules/auth/auth.controller';
import { clinicOnboardingRoutes } from './modules/clinics/onboarding.controller';
import { clinicSettingsRoutes } from './modules/clinics/settings.controller';
import { diagnosisRoutes } from './modules/diagnoses/diagnoses.controller';
import { encounterRoutes } from './modules/encounters/encounters.controller';
import { notesRoutes } from './modules/notes/notes.controller';
import { patientHistoryRoutes } from './modules/patients/history.controller';
import { patientRoutes } from './modules/patients/patients.controller';
import { paymentRoutes } from './modules/payments/payments.controller';
import { queueRoutes } from './modules/queue/queue.controller';
import { userRoutes } from './modules/users/users.controller';
import { vitalsRoutes } from './modules/vitals/vitals.controller';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(auditMiddleware);
  app.use(requireActiveSubscription);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/clinics', clinicOnboardingRoutes);
  app.use('/api/v1/clinics', clinicSettingsRoutes);
  app.use('/api/v1/users', userRoutes);
  if (config.featureFlags.stellarBilling) {
    app.use('/api/v1/payments', paymentRoutes);
  }
  if (config.featureFlags.aiSummaries) {
    app.use('/api/v1/ai', aiRoutes);
    app.use('/api/v1/ai', aiDraftRoutes);
  }
  app.use('/api/v1/queue', queueRoutes);
  app.use('/api/v1', diagnosisRoutes);
  app.use('/api/v1/patients', patientRoutes);
  app.use('/api/v1/patients', patientHistoryRoutes);
  app.use('/api/v1/vitals', vitalsRoutes);
  app.use('/api/v1/encounters', encounterRoutes);
  app.use('/api/v1/notes', notesRoutes);
  app.use('/api/v1/audit-logs', auditRoutes);

  app.get('/health', (_req, res) => {
    const diagnostics = getConfigDiagnostics();
    res.json({
      status: 'ok',
      timestamp: new Date(),
      featureFlags: config.featureFlags,
      diagnostics: {
        present: diagnostics.environment.filter((item) => item.status === 'present').length,
        missing: diagnostics.environment.filter((item) => item.status === 'missing').length,
        defaulted: diagnostics.environment.filter((item) => item.status === 'defaulted').length,
      },
    });
  });

  app.use(errorMiddleware);

  return app;
};
