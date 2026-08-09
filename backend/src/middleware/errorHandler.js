import { ZodError } from 'zod';
import { AppError } from '../utils/appError.js';

export function notFound(_req, _res, next) {
  next(new AppError('Route not found', 404));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, details: error.details });
    return;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = firstIssue?.path.join('.');
    const message = firstIssue
      ? field ? `${field}: ${firstIssue.message}` : firstIssue.message
      : 'Validation error';
    res.status(400).json({ message, details: error.issues });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  res.status(500).json({ message });
}
