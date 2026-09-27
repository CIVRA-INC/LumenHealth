import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingTimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest();
    const method = req ? req.method : 'UNKNOWN';
    const url = req ? req.url : 'UNKNOWN';

    return next.handle().pipe(
      tap(() => {
        const delay = Date.now() - now;
        console.log(`[${method}] ${url} - ${delay}ms`);
      }),
    );
  }
}

export class RequestIdMiddleware {
  public static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
