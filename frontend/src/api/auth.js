import { api } from './client';

export async function registerRequest(payload) {
  const response = await api.post('/auth/register', payload);
  return response.data.user;
}

export async function loginRequest(payload) {
  const response = await api.post('/auth/login', payload);
  return response.data.user;
}

export async function meRequest() {
  const response = await api.get('/auth/me');
  return response.data.user;
}

export async function logoutRequest() {
  await api.post('/auth/logout');
}
