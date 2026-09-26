import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [],
})
export class AuditModule {}
