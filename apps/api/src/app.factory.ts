import cors from 'cors';
import express, { Express } from 'express';
import { config } from '@lumen/config';
import { antiAbuseMiddleware } from './middlewares/anti-abuse.middleware';
import { auditMiddleware } from './middlewares/audit.middleware';
import { authRateLimiter, mutationRateLimiter } from './middlewares/rate-limit.middleware';
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
import { healthRoutes } from './modules/health/health.controller';
import { notesRoutes } from './modules/notes/notes.controller';
import { patientHistoryRoutes } from './modules/patients/history.controller';
import { patientRoutes } from './modules/patients/patients.controller';
import { paymentRoutes } from './modules/payments/payments.controller';
import { queueRoutes } from './modules/queue/queue.controller';
import { userRoutes } from './modules/users/users.controller';
import { vitalsRoutes } from './modules/vitals/vitals.controller';
import { registrationAbuseGuard } from './middlewares/anti-abuse.middleware';

export const createApp = (): Express => {
  const app = express();

  // Global guards (run before body parsing to catch oversized payloads early)
  app.use(...antiAbuseMiddleware);

  app.use(cors());
  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(auditMiddleware);
  app.use(requireActiveSubscription);

  // Health / readiness / diagnostics (no auth, no rate limiting)
  app.use(healthRoutes);

  // Auth routes — strict rate limiting
  app.use('/api/v1/auth', authRateLimiter, authRoutes);

  // Clinic registration — auth rate limit + registration abuse guard
  app.use('/api/v1/clinics', authRateLimiter, registrationAbuseGuard, clinicOnboardingRoutes);
  app.use('/api/v1/clinics', clinicSettingsRoutes);

  // Mutation rate limiting on all state-changing API routes
  app.use('/api/v1', mutationRateLimiter);

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

  app.use(errorMiddleware);

  return app;
};
