import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.ts';

// Thrown by routes/services for client-facing failures. The message is safe to
// return; anything else surfaces as a generic 500.
export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string): AppError => new AppError(400, 'bad_request', message);
export const unauthorized = (message = 'Unauthorized'): AppError => new AppError(401, 'unauthorized', message);
export const notFound = (message = 'Not found'): AppError => new AppError(404, 'not_found', message);

// Wrap async handlers so rejected promises reach the error middleware.
type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;
export const asyncHandler = (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction, // 4 args required for Express to treat this as error middleware
): void => {
  if (err instanceof AppError) {
    if (err.status >= 500) logger.error('Handled server error', { code: err.code, message: err.message });
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Never leak internals (stack, SQL, tokens) to the client.
  logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error' } });
};
