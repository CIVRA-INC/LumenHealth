import { z } from 'zod';

export const uuidSchema = z.uuid();

/** Calendar date (no time zone), e.g. a date of birth. Format: YYYY-MM-DD. */
export const dateOnlySchema = z.iso.date();

/** Instant in UTC, serialised as an ISO-8601 string. */
export const instantSchema = z.iso.datetime({ offset: true });

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Page-number pagination parameters, validated and bounded on every list endpoint. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const sortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

/**
 * Every paginated list returns its rows plus enough metadata to draw page controls without a second
 * request. A page beyond the last returns no items but correct metadata, so the client can move to the last page.
 */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function toPage<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/** Consistent error envelope returned by every failing API call. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

export const ERROR_CODES = {
  validation: 'VALIDATION_FAILED',
  unauthenticated: 'UNAUTHENTICATED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  conflict: 'CONFLICT',
  invalidTransition: 'INVALID_STATE_TRANSITION',
  duplicatePatient: 'POTENTIAL_DUPLICATE_PATIENT',
  duplicateIdentifier: 'DUPLICATE_IDENTIFIER',
  staleVersion: 'STALE_VERSION',
  locked: 'ENCOUNTER_LOCKED',
  patientMismatch: 'PATIENT_MISMATCH',
  documentationIncomplete: 'DOCUMENTATION_INCOMPLETE',
  passwordChangeRequired: 'PASSWORD_CHANGE_REQUIRED',
  accountLocked: 'ACCOUNT_LOCKED',
  rateLimited: 'RATE_LIMITED',
  internal: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
