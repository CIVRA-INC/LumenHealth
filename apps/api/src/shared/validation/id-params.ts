import {
  HttpException,
  HttpStatus,
  ParseUUIDPipe,
  type PipeTransform,
} from '@nestjs/common';

const invalid = (message: string) =>
  new HttpException({ error: 'VALIDATION_FAILED', message }, HttpStatus.BAD_REQUEST);

/** Path-parameter pipe for ids generated with `randomUUID()` (audit, staff, invitation). */
export const uuidParamPipe = (): ParseUUIDPipe =>
  new ParseUUIDPipe({
    version: '4',
    exceptionFactory: () => invalid('identifier must be a valid UUID'),
  });

/**
 * Clinic ids are issued by the auth flow rather than `randomUUID()`, so the
 * format check is a bounded, safe-character one (no control characters or path
 * segments, at most 64 characters). The clinic scope guard still decides access.
 */
export class ClinicIdParamPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
      throw invalid('clinicId has an invalid format');
    }
    return value;
  }
}
