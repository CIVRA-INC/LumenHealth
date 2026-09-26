import { Module, Global } from '@nestjs/common';
import { RolePolicyService } from './role-policy.service.js';

@Global()
@Module({
  providers: [RolePolicyService],
  exports: [RolePolicyService],
})
export class RolePolicyModule {}
