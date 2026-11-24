import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@lumen/contracts';
import { ERROR_CODES } from '@lumen/contracts';
import {
  ALLOW_PASSWORD_CHANGE,
  IS_AUTHENTICATED,
  IS_PUBLIC,
  REQUIRED_PERMISSIONS,
} from '../../common/decorators';
import { DomainError, ForbiddenError, UnauthenticatedError } from '../../common/errors';
import type { AuthedRequest } from '../../common/request-context';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { AuditService } from '../audit/audit.service';
import { SessionService } from './session.service';

/** Rejects state-changing requests from origins other than the web app (CSRF defense in depth). */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    const origin = req.headers.origin;
    // Browsers always send Origin on cross-site POST/PATCH/DELETE; non-browser clients may not.
    if (!origin) return true;
    if (this.config.WEB_ORIGINS.includes(origin)) return true;
    try {
      if (new URL(origin).host === req.headers.host) return true;
    } catch {
      // fall through
    }
    throw new ForbiddenError('Cross-origin request rejected');
  }
}

/** Resolves the session cookie to a request context. Every route needs one unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[
      this.config.SESSION_COOKIE_NAME
    ];
    if (!token) throw new UnauthenticatedError();

    const ctx = await this.sessions.resolve(token);
    if (!ctx) throw new UnauthenticatedError('Your session has expired. Please sign in again.');

    ctx.ip = req.ip;
    ctx.userAgent = req.headers['user-agent'];
    ctx.requestId = String(req.id ?? '');
    req.ctx = ctx;

    if (
      ctx.mustChangePassword &&
      !this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE, targets)
    ) {
      throw new DomainError(
        403,
        ERROR_CODES.passwordChangeRequired,
        'You must change your temporary password before continuing',
      );
    }
    return true;
  }
}

/**
 * Enforces @RequirePermissions. Secure by default: a route that is neither @Public(),
 * @Authenticated() nor permission-annotated is refused.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRED_PERMISSIONS,
      targets,
    );
    const authenticatedOnly = this.reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED, targets);
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const ctx = req.ctx;
    if (!ctx) throw new UnauthenticatedError();

    if (!required?.length) {
      if (authenticatedOnly) return true;
      this.logger.error(
        `Route ${req.method} ${req.path} declares no authorization metadata; refusing`,
      );
      throw new ForbiddenError();
    }

    const missing = required.filter((p) => !ctx.permissions.includes(p));
    if (missing.length === 0) return true;

    await this.audit
      .recordStandalone(ctx, {
        action: 'access.denied',
        resourceType: 'route',
        outcome: 'DENIED',
        metadata: { method: req.method, path: req.route?.path ?? req.path, missing },
      })
      .catch((err: unknown) => this.logger.warn({ err }, 'Failed to record denied access'));
    throw new ForbiddenError();
  }
}
