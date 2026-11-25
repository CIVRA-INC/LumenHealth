import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ConfigModule } from './config/config.module';
import { loadConfig } from './config/env';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardController } from './modules/dashboard/dashboard.controller';
import { EmailModule } from './modules/email/email.module';
import { AdminInvitationsController } from './modules/invitations/admin-invitations.controller';
import { InvitationsController } from './modules/invitations/invitations.controller';
import { InvitationsService } from './modules/invitations/invitations.service';
import { PlatformController } from './modules/platform/platform.controller';
import { PlatformService } from './modules/platform/platform.service';
import { EncountersController } from './modules/encounters/encounters.controller';
import { EncountersService } from './modules/encounters/encounters.service';
import { HealthController } from './modules/health/health.controller';
import { AuthController } from './modules/identity/auth.controller';
import { AuthService } from './modules/identity/auth.service';
import { AuthGuard, OriginGuard, PermissionsGuard } from './modules/identity/guards';
import { PasswordService } from './modules/identity/password.service';
import { SessionService } from './modules/identity/session.service';
import { UsersAdminController } from './modules/identity/users-admin.controller';
import { OrganizationsController } from './modules/organizations/organizations.controller';
import { PatientsController } from './modules/patients/patients.controller';
import { PatientsService } from './modules/patients/patients.service';
import { SchedulingController } from './modules/scheduling/scheduling.controller';
import { SchedulingService } from './modules/scheduling/scheduling.service';

const config = loadConfig();

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuditModule,
    EmailModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: config.LOG_LEVEL,
        genReqId: (req, res) => {
          const incoming = req.headers['x-request-id'];
          const id =
            typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming)
              ? incoming
              : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        // Request lines carry the path only. Query strings often hold search text such as patient names.
        serializers: {
          req: (req: { id: string; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            path: req.url.split('?')[0],
          }),
          res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
        },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        },
        ...(config.NODE_ENV === 'development'
          ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
          : {}),
        autoLogging: { ignore: (req) => req.url?.includes('/health/') ?? false },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 600 }],
      skipIf: () => !config.RATE_LIMIT_ENABLED,
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    UsersAdminController,
    AdminInvitationsController,
    InvitationsController,
    PlatformController,
    OrganizationsController,
    PatientsController,
    SchedulingController,
    EncountersController,
    DashboardController,
  ],
  providers: [
    PasswordService,
    SessionService,
    AuthService,
    InvitationsService,
    PlatformService,
    PatientsService,
    SchedulingService,
    EncountersService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Guard order matters: rate limit → origin check → authentication → authorization.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
