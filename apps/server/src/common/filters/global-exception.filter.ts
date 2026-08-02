import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'internal_error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      message = typeof res === 'string' ? res : res.message || message;
      code = res.error || 'http_error';
      details = res.message || res;
    }

    const errorEnvelope = {
      error: {
        code,
        message,
        details,
        trace_id: request.headers['x-request-id'] || 'no-trace-id',
      },
    };

    response.status(status).json(errorEnvelope);
  }
}
