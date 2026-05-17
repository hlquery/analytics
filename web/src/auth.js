import { reactive } from 'vue';
import { api } from '@/api';

export const authState = reactive({
  loaded: false,
  autologin: false,
  authenticated: false,
  user: null,
});

export async function fetchMe() {
  const { data } = await api.get('/api/auth/me');
  authState.loaded = true;
  authState.autologin = Boolean(data.autologin);
  authState.authenticated = Boolean(data.authenticated);
  authState.user = data.user || null;
  return authState;
}

export async function login(username, password) {
  const { data } = await api.post('/api/auth/login', { username, password });
  authState.loaded = true;
  authState.autologin = false;
  authState.authenticated = true;
  authState.user = data.user || null;
  return data;
}

export async function logout() {
  await api.post('/api/auth/logout');
  authState.loaded = true;
  authState.authenticated = false;
  authState.user = null;
}

