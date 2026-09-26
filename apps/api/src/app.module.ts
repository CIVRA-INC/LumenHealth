import { Module } from '@nestjs/common';
import { ClinicModule } from './modules/clinic/clinic.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { InvitationModule } from './modules/staff/invitation.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { RolePolicyModule } from './shared/role-policy/role-policy.module.js';

@Module({
  imports: [
    RolePolicyModule,
    AuthModule,
    ClinicModule,
    StaffModule,
    InvitationModule,
    AuditModule,
  ],
})
export class AppModule {}
