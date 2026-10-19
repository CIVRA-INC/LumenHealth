import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { isDbReady, readDbConfig } from '../db/connection.js';

/**
 * Liveness/readiness endpoint for external uptime checks.
 *
 * Ported from the inline `app.get("/health", …)` handler in `src/app.ts`.
 * The response shape is a public contract — load balancers, container probes
 * and the deploy dashboards all match on these three fields — so it is kept
 * exactly as the Express version produced it, including the `milestone` value.
 *
 * Registered on `AppModule` and excluded from the global `/api/v1` prefix in
 * `src/server.ts` so it stays reachable at the root path.
 */
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { service: 'api', status: 'ok', milestone: 'staff-invitations' };
  }

  /** Readiness: 503 when a database is configured but not reachable. */
  @Get('ready')
  async ready() {
    const dbConfigured = readDbConfig() !== undefined;
    const db = dbConfigured ? ((await isDbReady()) ? 'up' : 'down') : 'not_configured';
    if (db === 'down') {
      throw new HttpException({ service: 'api', status: 'unavailable', db }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { service: 'api', status: 'ready', db };
  }
}
