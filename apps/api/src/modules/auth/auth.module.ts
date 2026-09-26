import { Module } from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard.js';
import { AuthController } from './controllers/auth.controller.js';

@Module({
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
