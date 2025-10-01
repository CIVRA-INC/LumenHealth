import jwt from 'jsonwebtoken';
import { JWTPayload } from '../middleware/authenticate';

export function signToken(
  staffId: string,
  role: string,
  clinicId: string
): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign({ id: staffId, role, clinicId }, process.env.JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '1d',
  });
}

export function verifyToken(token: string): JWTPayload {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return decoded as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
