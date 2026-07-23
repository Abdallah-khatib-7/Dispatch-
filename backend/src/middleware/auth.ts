import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt.ts';
import { unauthorized } from './errors.ts';

declare global {
  namespace Express {
    interface Request {
      auth?: { sub: string };
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    next(unauthorized('Missing bearer token'));
    return;
  }
  try {
    const payload = verifyToken(match[1]!);
    req.auth = { sub: payload.sub };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
};
