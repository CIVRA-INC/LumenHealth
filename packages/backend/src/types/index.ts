export interface PatientSearchQuery {
  $text?: { $search: string };
  $or?: Array<{
    firstName?: { $regex: string; $options: string };
    lastName?: { $regex: string; $options: string };
    UPID?: { $regex: string; $options: string };
  }>;
  firstName?: { $regex: string; $options: string };
  lastName?: { $regex: string; $options: string };
  UPID?: { $regex: string; $options: string };
}

import { Request } from 'express';
import { JWTPayload } from '../middleware';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}
