import { HttpException, HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';

/**
 * Error code used when the offending DTO does not declare its own.
 *
 * `VALIDATION_FAILED` is already the code `StaffController` raises for
 * hand-rolled body validation, so reusing it keeps the API's error vocabulary
 * to one shape rather than inventing a fourth code.
 */
const DEFAULT_ERROR_CODE = 'VALIDATION_FAILED';

type DtoInstance = { constructor?: { validationErrorCode?: unknown } };

/**
 * Resolve the error code from the DTO that failed.
 *
 * `ValidationError.target` is the DTO instance, so the declared code lives on
 * its constructor as a static. Whitelisting errors may not carry a usable
 * target, so every error is scanned before falling back to the default.
 */
function errorCodeFor(errors: ValidationError[]): string {
  for (const error of errors) {
    const target = error.target as DtoInstance | undefined;
    const code = target?.constructor?.validationErrorCode;
    if (typeof code === 'string') {
      return code;
    }
  }
  return DEFAULT_ERROR_CODE;
}

/**
 * Pick the offending field and message.
 *
 * Mirrors what `clinicValidationPipe` and `invitationValidationPipe` do for
 * plain constraint errors (first error, first constraint), and additionally
 * unwraps the `whitelistValidation` wrapper class-validator produces for an
 * unexpected property so `field` names the property the client actually sent.
 */
function firstFailure(errors: ValidationError[]): { field: string; message: string } {
  const error = errors[0];
  if (!error) {
    return { field: 'body', message: 'invalid input' };
  }

  const nested = error.constraints ? undefined : error.children?.[0];
  const source = nested ?? error;
  const message = source.constraints
    ? Object.values(source.constraints)[0] ?? 'invalid input'
    : 'invalid input';

  return { field: nested ? nested.property : error.property, message };
}

/**
 * The single validation default for every controller in the app.
 *
 * Registered in `src/server.ts` via `app.useGlobalPipes(...)` so no module has
 * to repeat the same options. The per-module pipes
 * (`clinicValidationPipe`, `invitationValidationPipe`) are kept: they are what
 * the module-level tests exercise, and they declare the domain error code on
 * their DTOs, which this factory reads back so responses are unchanged.
 *
 * Behaviour this establishes app-wide:
 *   - `whitelist: true` — unknown properties are stripped off the DTO.
 *   - `forbidNonWhitelisted: true` — stripping is not silent; the request is
 *     rejected with 400 rather than quietly dropping what the client sent.
 *   - `transform: true` — handlers receive a real DTO instance.
 *
 * Bodies typed `any`/`unknown` and `@lumen/types` interfaces have no runtime
 * metatype, so they are still validated by their handlers. That is unchanged.
 */
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const failure = firstFailure(errors);
      return new HttpException(
        {
          error: errorCodeFor(errors),
          message: failure.message,
          field: failure.field,
        },
        HttpStatus.BAD_REQUEST,
      );
    },
  });
}
