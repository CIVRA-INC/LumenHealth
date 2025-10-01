import { NextFunction, Request, Response } from 'express';
import { ZodObject } from 'zod';

export const validate =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err: any) {
      next(err);
    }
  };
