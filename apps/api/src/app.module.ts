import { Module } from '@nestjs/common';
import { ClinicModule } from './modules/clinic/clinic.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
    ClinicModule,
  ],
})
export class AppModule {}
