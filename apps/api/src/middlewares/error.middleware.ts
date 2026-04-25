import { ErrorRequestHandler } from 'express';
import { logger } from '../core/logger';
import { ApiProblem, internalProblem } from '../core/problem';

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const problem = error instanceof ApiProblem ? error : internalProblem();
  const correlationId = req.context?.correlationId ?? 'unknown';
  const userId = req.context?.actor?.userId;

  if (!(error instanceof ApiProblem)) {
    logger.error('unhandled error', {
      requestId: correlationId,
      ...(userId ? { userId } : {}),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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
