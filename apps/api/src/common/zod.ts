import { ApiBody } from '@nestjs/swagger';
import { z } from 'zod';
import { ValidationError } from './errors';

/** Validates untrusted input against a contract schema. Throws a 400 with per-field messages. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ValidationError('The request is not valid', { fields });
  }
  return result.data;
}

/** Documents a request body in the OpenAPI spec from its zod contract. */
export function ZodApiBody(schema: z.ZodType): MethodDecorator {
  return ApiBody({
    schema: z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<
      string,
      unknown
    >,
  });
}
