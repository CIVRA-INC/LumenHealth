import { ZodError } from 'zod';

// ── Error codes ────────────────────────────────────────────────────────────────
// Domain errors (4xx)
// Auth errors
// Infrastructure errors (5xx)
export type ProblemCode =
  // auth
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  // resource
  | 'NOT_FOUND'
  | 'CONFLICT'
  // validation
  | 'VALIDATION_ERROR'
  | 'INVALID_HEADERS'
  // payment / subscription
  | 'PAYMENT_REQUIRED'
  | 'SUBSCRIPTION_EXPIRED'
  // domain
  | 'DOMAIN_ERROR'
  // infrastructure
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'DATABASE_ERROR'
  | 'UPSTREAM_ERROR';

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

// ── Auth ───────────────────────────────────────────────────────────────────────
export const unauthorizedProblem = (message = 'Authentication required') =>
  new ApiProblem(401, 'UNAUTHORIZED', message);

export const tokenExpiredProblem = (message = 'Token has expired') =>
  new ApiProblem(401, 'TOKEN_EXPIRED', message);

export const tokenInvalidProblem = (message = 'Token is invalid') =>
  new ApiProblem(401, 'TOKEN_INVALID', message);

export const forbiddenProblem = (message = 'Insufficient permissions') =>
  new ApiProblem(403, 'FORBIDDEN', message);

// ── Resource ───────────────────────────────────────────────────────────────────
export const notFoundProblem = (message = 'Resource not found') =>
  new ApiProblem(404, 'NOT_FOUND', message);

export const conflictProblem = (message = 'Resource already exists') =>
  new ApiProblem(409, 'CONFLICT', message);

// ── Validation ─────────────────────────────────────────────────────────────────
export const validationProblem = (error: ZodError) =>
  new ApiProblem(400, 'VALIDATION_ERROR', 'Request validation failed', {
    details: error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join('.') : 'root',
      message: issue.message,
      code: issue.code,
    })),
  });

export const invalidHeadersProblem = (message = 'Invalid or missing required headers') =>
  new ApiProblem(400, 'INVALID_HEADERS', message);

// ── Payment / subscription ─────────────────────────────────────────────────────
export const paymentRequiredProblem = (
  message = 'Subscription expired. Write access is disabled. Please renew billing to continue.',
) => new ApiProblem(402, 'PAYMENT_REQUIRED', message);

export const subscriptionExpiredProblem = (message = 'Subscription has expired') =>
  new ApiProblem(402, 'SUBSCRIPTION_EXPIRED', message);

// ── Domain ─────────────────────────────────────────────────────────────────────
export const domainProblem = (message: string, details?: unknown) =>
  new ApiProblem(422, 'DOMAIN_ERROR', message, { details });

// ── Infrastructure ─────────────────────────────────────────────────────────────
export const internalProblem = (message = 'Internal server error') =>
  new ApiProblem(500, 'INTERNAL_ERROR', message, { expose: false });

export const serviceUnavailableProblem = (message = 'Service temporarily unavailable') =>
  new ApiProblem(503, 'SERVICE_UNAVAILABLE', message, { expose: false });

export const databaseProblem = (message = 'Database operation failed') =>
  new ApiProblem(500, 'DATABASE_ERROR', message, { expose: false });

export const upstreamProblem = (message = 'Upstream service error') =>
  new ApiProblem(502, 'UPSTREAM_ERROR', message, { expose: false });

// ── Mapper: unknown → ApiProblem ───────────────────────────────────────────────
/**
 * Maps any thrown value to a stable ApiProblem.
 * Use this in catch blocks to normalise errors before passing to next().
 */
export const toApiProblem = (error: unknown): ApiProblem => {
  if (error instanceof ApiProblem) return error;
  if (error instanceof ZodError) return validationProblem(error);
  return internalProblem();
};
