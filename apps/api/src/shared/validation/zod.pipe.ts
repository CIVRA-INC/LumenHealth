import { HttpException, HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

/**
 * Validates a request body with a shared zod schema from `@lumen/types`, so
 * the server enforces exactly the rules the web forms use. Failures use the
 * module's existing error envelope (`{ error, message, field }`, 400).
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodTypeAny,
    private readonly errorCode: string = 'VALIDATION_FAILED',
  ) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new HttpException(
        {
          error: this.errorCode,
          message: issue?.message ?? 'invalid input',
          field: issue?.path.join('.') ?? '',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result.data;
  }
}
