import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Prisma unique constraint violation
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    res.status(409).json({ error: 'Resource already exists (unique constraint violation)' });
    return;
  }

  // Prisma record not found
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2025'
  ) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  // Generic error
  if (err instanceof Error) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
