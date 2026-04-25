import { Router } from 'express';
import mongoose from 'mongoose';
import { config, getConfigDiagnostics } from '@lumen/config';

const router = Router();

type DepStatus = 'ok' | 'degraded' | 'unavailable';

interface DepCheck {
  name: string;
  status: DepStatus;
  latencyMs?: number;
  detail?: string;
}

async function checkMongo(): Promise<DepCheck> {
  const start = Date.now();
  try {
    const state = mongoose.connection.readyState;
    // 1 = connected
    if (state !== 1) {
      return { name: 'mongodb', status: 'unavailable', detail: `readyState=${state}` };
    }
    // Ping to confirm the connection is live
    await mongoose.connection.db?.admin().ping();
    return { name: 'mongodb', status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name: 'mongodb',
      status: 'unavailable',
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * GET /health
 * Liveness probe — always returns 200 if the process is running.
 * Replaces the basic /health in app.factory.ts.
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    featureFlags: config.featureFlags,
  });
});

/**
 * GET /ready
 * Readiness probe — returns 200 only when all critical dependencies are reachable.
 * Kubernetes / load-balancer should use this before routing traffic.
 */
router.get('/ready', async (_req, res) => {
  const mongo = await checkMongo();
  const allOk = mongo.status === 'ok';

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    dependencies: [mongo],
  });
});

/**
 * GET /diagnostics
 * Full dependency + config diagnostics. Intended for internal/ops use.
 */
router.get('/diagnostics', async (_req, res) => {
  const [mongo] = await Promise.all([checkMongo()]);
  const configDiag = getConfigDiagnostics();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dependencies: [mongo],
    config: {
      present: configDiag.environment.filter((e) => e.status === 'present').length,
      missing: configDiag.environment.filter((e) => e.status === 'missing').length,
      defaulted: configDiag.environment.filter((e) => e.status === 'defaulted').length,
      entries: configDiag.environment.map(({ name, status, valuePreview }) => ({
        name,
        status,
        valuePreview,
      })),
    },
  });
});

export { router as healthRoutes };
