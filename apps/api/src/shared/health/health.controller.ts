import { Controller, Get } from '@nestjs/common';

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
}
