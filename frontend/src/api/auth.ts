import { api } from './client';
import type { User } from '../types/api';

interface AuthResponse {
  user: User;
  token?: string;
}

export async function registerRequest(payload: { email: string; password: string; displayName?: string }): Promise<User> {
  const response = await api.post<AuthResponse>('/auth/register', payload);
  return response.data.user;
}

export async function loginRequest(payload: { email: string; password: string }): Promise<User> {
  const response = await api.post<AuthResponse>('/auth/login', payload);
  return response.data.user;
}

export async function meRequest(): Promise<User> {
  const response = await api.get<{ user: User }>('/auth/me');
  return response.data.user;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}
