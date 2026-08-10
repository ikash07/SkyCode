import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getUserProfile, loginUser, registerUser } from '../services/authService.js';
import { AppError } from '../utils/appError.js';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(60).optional()
});

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

export const register = asyncHandler(async (req, res) => {
  const input = authSchema.parse(req.body);
  const { user, token } = await registerUser(input);
  setAuthCookie(res, token);
  res.status(201).json({ user, token });
});

export const login = asyncHandler(async (req, res) => {
  const input = authSchema.parse(req.body);
  const { user, token } = await loginUser(input);
  setAuthCookie(res, token);
  res.json({ user, token });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.auth?.sub) {
    throw new AppError('Not authenticated', 401);
  }

  const user = await getUserProfile(req.auth.sub);
  res.json({ user });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('token');
  res.status(204).end();
});
