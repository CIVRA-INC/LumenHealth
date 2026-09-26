import { Module } from '@nestjs/common';
import { ClinicController } from './controllers/clinic.controller.js';
import { ClinicRepository, clinicStore } from './repositories/clinic.repository.js';
import { AuthModule } from '../auth/auth.module.js';

// Scaffold empty ClinicService for future use (issue 1199)
import { Injectable } from '@nestjs/common';
@Injectable()
export class ClinicService {}

@Module({
  imports: [AuthModule],
  controllers: [ClinicController],
  providers: [
    ClinicService,
    {
      provide: ClinicRepository,
      useValue: clinicStore // Use the same instance for now so old and new code share state!
    }
  ],
  exports: [ClinicService, ClinicRepository],
})
export class ClinicModule {}
