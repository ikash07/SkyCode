import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  return req.cookies?.token ?? null;
}

export function requireAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  try {
    req.auth = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch {
    throw new AppError('Invalid session', 401);
  }
}
