import { RequestHandler } from "express";
import { z, ZodError, ZodTypeAny } from "zod";

type RequestSchema = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

type InferOrUnknown<T> = T extends ZodTypeAny ? z.infer<T> : unknown;

export type TypedRequestHandler<TSchema extends RequestSchema> = RequestHandler<
  Record<string, string>,
  unknown,
  InferOrUnknown<TSchema["body"]>,
  Record<string, unknown>
>;

const formatValidationIssues = (error: ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
    code: issue.code,
  }));

export const validateRequest = <TSchema extends RequestSchema>(
  schema: TSchema,
): TypedRequestHandler<TSchema> => {
  const middleware: TypedRequestHandler<TSchema> = async (req, res, next) => {
    try {
      if (schema.body) {
        req.body = (await schema.body.parseAsync(req.body)) as InferOrUnknown<
          TSchema["body"]
        >;
      }

      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as Record<
          string,
          unknown
        >;
      }

      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as Record<
          string,
          string
        >;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Request validation failed",
          issues: formatValidationIssues(error),
        });
      }

      next(error);
    }
  };

  return middleware;
};
