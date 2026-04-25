import { RequestHandler } from 'express';
import { logger } from '../core/logger';

export const requestLoggerMiddleware: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const correlationId = req.context?.correlationId ?? 'unknown';
    const userId = req.context?.actor?.userId;

    logger.info('http request', {
      requestId: correlationId,
      ...(userId ? { userId } : {}),
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
};
