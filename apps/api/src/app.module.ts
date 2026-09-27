import { Module } from '@nestjs/common';
import { ClinicModule } from './modules/clinic/clinic.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { InvitationModule } from './modules/staff/invitation.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { ConfigModule } from './shared/config/config.module.js';
import { RolePolicyModule } from './shared/role-policy/role-policy.module.js';
import { HealthController } from './shared/health/health.controller.js';

@Module({
  // ConfigModule is @Global(): it must be imported first so that every other
  // module can inject ConfigService without importing it itself.
  imports: [
    ConfigModule,
    RolePolicyModule,
    AuthModule,
    ClinicModule,
    StaffModule,
    InvitationModule,
    AuditModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
