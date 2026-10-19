import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { NonceReplayCache, verifyInternalRequest } from '@lumen/types';
import { Request } from 'express';
import { ConfigService } from '../../../shared/config/config.service.js';

/**
 * Authenticates service-to-service requests to the internal audit surface
 * (#1345): a short-lived HMAC signature over method, path, body hash,
 * timestamp, and nonce — replacing the static `x-internal-service-token`.
 *
 * The replay cache is shared process-wide so a captured nonce can't be
 * replayed against any route.
 */
const replayCache = new NonceReplayCache();

@Injectable()
export class InternalRequestAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const result = verifyInternalRequest(
      {
        method: req.method,
        path: req.originalUrl,
        body: req.body,
        headers: req.headers as Record<string, string | string[] | undefined>,
      },
      this.config.internalServiceSecrets,
      { replayCache },
    );

    if (!result.ok) {
      throw new HttpException(
        { error: "UNAUTHORIZED", message: result.reason },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }
}
