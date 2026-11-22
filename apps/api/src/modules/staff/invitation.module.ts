import { Module } from '@nestjs/common';
import { InvitationController } from './controllers/invitation.controller.js';
import { InvitationService } from './services/invitation.service.js';
import { InvitationRepository, invitationStore } from './repositories/invitation.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { RolePolicyModule } from '../../shared/role-policy/role-policy.module.js';

@Module({
  imports: [AuthModule, RolePolicyModule],
  controllers: [InvitationController],
  providers: [
    InvitationService,
    {
      provide: InvitationRepository,
      useValue: invitationStore // Provide the singleton instance
    }
  ],
  exports: [InvitationService, InvitationRepository],
})
export class InvitationModule {}
