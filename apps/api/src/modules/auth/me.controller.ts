import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';

export class RateLimiterGuard {
  private requests = new Map<string, number>();

  public canActivate(ip: string, maxRequests: number = 60): boolean {
    const current = this.requests.get(ip) || 0;
    if (current >= maxRequests) return false;
    this.requests.set(ip, current + 1);
    return true;
  }
}

@Controller('auth')
export class MeController {
  @Get('me')
  public getProfile(@Req() req: any) {
    return {
      user: req.user || { id: 'usr_default', role: 'CLINIC_STAFF' },
      authenticated: true,
    };
  }

  @Post('logout')
  public logout() {
    return { success: true, message: 'Logged out successfully' };
  }
}
