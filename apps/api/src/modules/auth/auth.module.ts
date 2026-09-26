import { Module } from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard.js';

@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
