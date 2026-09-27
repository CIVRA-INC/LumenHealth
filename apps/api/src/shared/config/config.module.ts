import { Global, Module } from '@nestjs/common';
import { authConfig, serverConfig } from '@lumen/config';
import { AUTH_CONFIG, ConfigService, SERVER_CONFIG } from './config.service.js';

/**
 * The single place in `apps/api` allowed to import `@lumen/config`.
 *
 * `@lumen/config` already owns `.env` loading and per-variable validation
 * (including throwing on a missing `JWT_SECRET`), so this module re-publishes
 * its exports as injectable providers rather than adding `@nestjs/config` and
 * a second, competing parser.
 *
 * Marked `@Global()` because `apiPort`, `internalServiceToken` and the Stellar
 * settings are needed by the composition root and by the audit module alike;
 * every other feature module can then inject `ConfigService` without importing
 * this module first.
 */
@Global()
@Module({
  providers: [
    { provide: SERVER_CONFIG, useValue: serverConfig },
    { provide: AUTH_CONFIG, useValue: authConfig },
    ConfigService,
  ],
  exports: [ConfigService, SERVER_CONFIG, AUTH_CONFIG],
})
export class ConfigModule {}
