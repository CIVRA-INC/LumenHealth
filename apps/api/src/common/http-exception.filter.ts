import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from '@lumen/contracts';
import { Prisma } from '../generated/prisma/client';
import { DomainError } from './errors';
import type { AuthedRequest } from './request-context';

interface Mapped {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/** Postgres SQLSTATE codes raised by our database-level invariants. */
const PG_CHECK_VIOLATION = '23514';
const PG_EXCLUSION_VIOLATION = '23P01';
const PG_INSUFFICIENT_PRIVILEGE = '42501';

function pgCode(error: unknown): string | undefined {
  const text = error instanceof Error ? `${error.message}` : '';
  const match = /\b(23514|23P01|42501)\b/.exec(text);
  if (match) return match[1];
  const meta = (
    error as {
      meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } };
    }
  ).meta;
  return meta?.code ?? meta?.driverAdapterError?.cause?.originalCode;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const res = http.getResponse<Response>();
    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      // Never echo internals to the client; log with the request id for correlation.
      this.logger.error(
        { err: exception, requestId: req.ctx?.requestId ?? req.id },
        'Unhandled error',
      );
    }

    const body: ApiErrorBody = {
      error: {
        code: mapped.code,
        message: mapped.message,
        requestId: String(req.id ?? ''),
        ...(mapped.details !== undefined ? { details: mapped.details } : {}),
      },
    };
    res.status(mapped.status).json(body);
  }

  private map(exception: unknown): Mapped {
    if (exception instanceof DomainError) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }
    if (exception instanceof ThrottlerException) {
      return {
        status: 429,
        code: ERROR_CODES.rateLimited,
        message: 'Too many requests. Please slow down.',
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code =
        status === 401
          ? ERROR_CODES.unauthenticated
          : status === 403
            ? ERROR_CODES.forbidden
            : status === 404
              ? ERROR_CODES.notFound
              : status === 400 || status === 413 || status === 415
                ? ERROR_CODES.validation
                : ERROR_CODES.internal;
      const message = status === 404 ? 'Resource not found' : exception.message;
      return { status, code, message };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: 409,
          code: ERROR_CODES.conflict,
          message: 'That record already exists or conflicts with another',
        };
      }
      if (exception.code === 'P2025') {
        return { status: 404, code: ERROR_CODES.notFound, message: 'Resource not found' };
      }
      if (exception.code === 'P2003') {
        return {
          status: 409,
          code: ERROR_CODES.conflict,
          message: 'The request refers to a record that does not exist',
        };
      }
    }
    const pg = pgCode(exception);
    if (pg === PG_CHECK_VIOLATION || pg === PG_EXCLUSION_VIOLATION) {
      return {
        status: 409,
        code: ERROR_CODES.conflict,
        message: 'The change conflicts with an existing record or a clinical safeguard',
      };
    }
    if (pg === PG_INSUFFICIENT_PRIVILEGE) {
      return {
        status: 403,
        code: ERROR_CODES.forbidden,
        message: 'That operation is not permitted',
      };
    }
    return {
      status: 500,
      code: ERROR_CODES.internal,
      message: 'Something went wrong. Please try again.',
    };
  }
}
