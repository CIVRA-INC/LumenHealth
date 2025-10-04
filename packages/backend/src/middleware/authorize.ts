import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware to enforce role-based access control
 * Accepts one or more allowed roles
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing role' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the roles [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};
