import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

@Controller()
export class MetricsController {
  @Get('metrics')
  public getMetrics() {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  public requestPasswordReset(@Body() body: { email: string }) {
    return {
      message: 'Password reset request received',
      email: body.email,
      sent: true,
    };
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  public confirmPasswordReset(@Body() body: { token: string; newPassword: string }) {
    return {
      message: 'Password reset confirmed',
      success: true,
    };
  }
}
