import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

function toAuthUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName
  };
}

export function signAuthToken(user) {
  return jwt.sign({ email: user.email, displayName: user.displayName }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export async function registerUser(input) {
  const email = input.email.toLowerCase().trim();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    email,
    displayName: input.displayName?.trim() || email.split('@')[0],
    passwordHash
  });

  const authUser = toAuthUser(user);
  return { user: authUser, token: signAuthToken(authUser) };
}

export async function loginUser(input) {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const authUser = toAuthUser(user);
  return { user: authUser, token: signAuthToken(authUser) };
}

export async function getUserProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  return toAuthUser(user);
}
