import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';

/**
 * Marks a response as non-cacheable. Set before the handler runs, so the headers also reach
 * error responses written by exception filters. Intended for routes carrying sensitive data
 * (audit snapshots, actor ids, exports) that must not linger in browser, proxy or CDN caches.
 */
@Injectable()
export class NoStoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return next.handle();
  }
}

/** `@NoStore()` — apply per route (or per controller) to send `Cache-Control: no-store` and friends. */
export const NoStore = () => UseInterceptors(NoStoreInterceptor);
