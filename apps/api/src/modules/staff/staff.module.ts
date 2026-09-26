import { Module } from '@nestjs/common';
import { StaffController } from './controllers/staff.controller.js';
import { StaffService } from './services/staff.service.js';
import { StaffRepository, staffStore } from './repositories/staff.repository.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [StaffController],
  providers: [
    StaffService,
    {
      provide: StaffRepository,
      useValue: staffStore,
    }
  ],
  exports: [StaffService],
})
export class StaffModule {}
