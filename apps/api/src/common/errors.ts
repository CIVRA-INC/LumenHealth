import { ERROR_CODES, type ErrorCode } from '@lumen/contracts';

/** An expected failure with a stable machine-readable code. Mapped to HTTP by the exception filter. */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'The request is not valid', details?: unknown) {
    super(400, ERROR_CODES.validation, message, details);
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = 'Authentication required') {
    super(401, ERROR_CODES.unauthenticated, message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'You do not have permission to do that') {
    super(403, ERROR_CODES.forbidden, message);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource = 'Resource') {
    super(404, ERROR_CODES.notFound, `${resource} not found`);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.conflict, details?: unknown) {
    super(409, code, message, details);
  }
}

export class InvalidTransitionError extends ConflictError {
  constructor(resource: string, from: string, to: string) {
    super(`${resource} cannot move from ${from} to ${to}`, ERROR_CODES.invalidTransition, {
      from,
      to,
    });
  }
}
