import { RequestHandler } from 'express';
import { z, ZodError, ZodTypeAny } from 'zod';
import { invalidHeadersProblem, validationProblem } from '../core/problem';

type RequestSchema = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
  headers?: ZodTypeAny;
};

type InferOrUnknown<T> = T extends ZodTypeAny ? z.infer<T> : unknown;

export type TypedRequestHandler<TSchema extends RequestSchema> = RequestHandler<
  Record<string, string>,
  unknown,
  InferOrUnknown<TSchema['body']>,
  Record<string, unknown>
>;

export const validateRequest = <TSchema extends RequestSchema>(
  schema: TSchema,
): TypedRequestHandler<TSchema> => {
  const middleware: TypedRequestHandler<TSchema> = async (req, _res, next) => {
    try {
      if (schema.headers) {
        try {
          await schema.headers.parseAsync(req.headers);
        } catch (error) {
          if (error instanceof ZodError) {
            return next(invalidHeadersProblem(
              error.issues.map((i) => i.message).join('; '),
            ));
          }
          return next(error);
        }
      }

      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as Record<string, string>;
      }

      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as Record<string, unknown>;
      }

      if (schema.body) {
        req.body = (await schema.body.parseAsync(req.body)) as InferOrUnknown<TSchema['body']>;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(validationProblem(error));
      }
      next(error);
    }
  };

  return middleware;
};
