import { NextFunction, Request, Response } from "express";

type AsyncMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const catchAsync: (
  fn: AsyncMiddleware
) => (req: Request, res: Response, next: NextFunction) => void = (
  fn: AsyncMiddleware
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
