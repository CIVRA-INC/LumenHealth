import { ErrorRequestHandler } from 'express';
import { ApiProblem, internalProblem } from '../core/problem';

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const problem = error instanceof ApiProblem ? error : internalProblem();
  const correlationId = req.context?.correlationId ?? 'unknown';

  if (!(error instanceof ApiProblem)) {
    console.error('[api] Unhandled error', {
      correlationId,
      error,
    });
  }

  return res.status(problem.statusCode).json({
    status: 'error',
    error: {
      code: problem.code,
      message: problem.expose ? problem.message : 'Internal server error',
      correlationId,
      ...(problem.details ? { details: problem.details } : {}),
    },
  });
};
