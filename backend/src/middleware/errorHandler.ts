import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError.js';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Route not found', 404));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, details: error.details });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  res.status(500).json({ message });
}
