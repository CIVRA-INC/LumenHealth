import { Module } from '@nestjs/common';
import { ClinicController } from './controllers/clinic.controller.js';
import { ClinicRepository, clinicStore } from './repositories/clinic.repository.js';
import { ClinicService } from './services/clinic.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ClinicController],
  providers: [
    ClinicService,
    {
      provide: ClinicRepository,
      useValue: clinicStore
    }
  ],
  exports: [ClinicService, ClinicRepository],
})
export class ClinicModule {}
