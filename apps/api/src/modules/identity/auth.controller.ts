import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  type AnySessionView,
  changePasswordSchema,
  loginSchema,
  switchContextSchema,
  type SessionView,
} from '@lumen/contracts';
import {
  AllowPendingPasswordChange,
  AnyPrincipal,
  Authenticated,
  Ctx,
  Public,
} from '../../common/decorators';
import type { AuthedRequest, RequestContext } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { Inject } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private cookieOptions(expires?: Date) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.SESSION_COOKIE_SECURE,
      path: '/',
      ...(expires ? { expires } : {}),
    };
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ZodApiBody(loginSchema)
  async login(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AnySessionView> {
    const input = parse(loginSchema, body);
    const { token, expiresAt, view } = await this.auth.login(input, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: String(req.id ?? ''),
    });
    res.cookie(this.config.SESSION_COOKIE_NAME, token, this.cookieOptions(expiresAt));
    return view;
  }

  @Post('logout')
  @AnyPrincipal()
  @AllowPendingPasswordChange()
  @HttpCode(204)
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout((req.ctx ?? req.platform)!);
    res.clearCookie(this.config.SESSION_COOKIE_NAME, this.cookieOptions());
  }

  @Get('session')
  @AnyPrincipal()
  @AllowPendingPasswordChange()
  session(@Req() req: AuthedRequest): Promise<AnySessionView> {
    return req.platform ? this.auth.viewPlatform(req.platform) : this.auth.view(req.ctx!);
  }

  @Post('switch-context')
  @Authenticated()
  @HttpCode(200)
  @ZodApiBody(switchContextSchema)
  switchContext(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<SessionView> {
    return this.auth.switchContext(ctx, parse(switchContextSchema, body));
  }

  @Post('change-password')
  @AnyPrincipal()
  @AllowPendingPasswordChange()
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ZodApiBody(changePasswordSchema)
  async changePassword(@Req() req: AuthedRequest, @Body() body: unknown): Promise<void> {
    await this.auth.changePassword((req.ctx ?? req.platform)!, parse(changePasswordSchema, body));
  }
}
