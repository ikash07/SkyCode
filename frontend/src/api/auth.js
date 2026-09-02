import { api } from './client';

export async function registerRequest(payload) {
  const response = await api.post('/auth/register', payload);
  if (response.data?.token) {
    localStorage.setItem('skycode_token', response.data.token);
  }
  return response.data.user;
}

export async function loginRequest(payload) {
  const response = await api.post('/auth/login', payload);
  if (response.data?.token) {
    localStorage.setItem('skycode_token', response.data.token);
  }
  return response.data.user;
}

export async function meRequest() {
  const response = await api.get('/auth/me');
  return response.data.user;
}

export async function logoutRequest() {
  localStorage.removeItem('skycode_token');
  await api.post('/auth/logout');
}
