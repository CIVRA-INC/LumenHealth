import { Module } from '@nestjs/common';
import { ClinicModule } from './modules/clinic/clinic.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { InvitationModule } from './modules/staff/invitation.module.js';

@Module({
  imports: [
    AuthModule,
    ClinicModule,
    StaffModule,
    InvitationModule,
  ],
})
export class AppModule {}
