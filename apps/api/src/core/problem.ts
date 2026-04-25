import { ZodError } from 'zod';

export type ProblemCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'PAYMENT_REQUIRED'
  | 'INTERNAL_ERROR';

export class ApiProblem extends Error {
  statusCode: number;
  code: ProblemCode;
  details?: unknown;
  expose: boolean;

  constructor(
    statusCode: number,
    code: ProblemCode,
    message: string,
    options?: { details?: unknown; expose?: boolean },
  ) {
    super(message);
    this.name = 'ApiProblem';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.expose = options?.expose ?? true;
  }
}

export const unauthorizedProblem = (message = 'Authentication required') =>
  new ApiProblem(401, 'UNAUTHORIZED', message);

export const forbiddenProblem = (message = 'Insufficient permissions') =>
  new ApiProblem(403, 'FORBIDDEN', message);

export const notFoundProblem = (message = 'Resource not found') =>
  new ApiProblem(404, 'NOT_FOUND', message);

export const paymentRequiredProblem = (
  message = 'Subscription expired. Write access is disabled. Please renew billing to continue.',
) => new ApiProblem(402, 'PAYMENT_REQUIRED', message);

export const validationProblem = (error: ZodError) =>
  new ApiProblem(400, 'VALIDATION_ERROR', 'Request validation failed', {
    details: error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join('.') : 'root',
      message: issue.message,
      code: issue.code,
    })),
  });

export const internalProblem = (message = 'Internal server error') =>
  new ApiProblem(500, 'INTERNAL_ERROR', message, { expose: false });
