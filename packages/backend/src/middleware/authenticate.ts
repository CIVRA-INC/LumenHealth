import { Response, Request, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { StaffRole } from '../models/staff.model';

export interface JWTPayload {
  id: string;
  role: StaffRole;
  clinicId: string;
  iat?: number;
  exp?: number;
}

export const authenticate = (
  req: Request & { user?: JWTPayload },
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
    return;
  }
};
